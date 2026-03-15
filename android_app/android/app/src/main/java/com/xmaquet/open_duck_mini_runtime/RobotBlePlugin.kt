package com.xmaquet.open_duck_mini_runtime

import android.Manifest
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue

@CapacitorPlugin(
    name = "RobotBle",
    permissions = [
        Permission(
            strings = [
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            ],
            alias = "bluetooth"
        ),
        Permission(
            strings = [Manifest.permission.ACCESS_FINE_LOCATION],
            alias = "location"
        )
    ]
)
class RobotBlePlugin : Plugin() {

    private val mainHandler = Handler(Looper.getMainLooper())

    private val defaultServiceUuid = UUID.fromString("12345678-1234-5678-1234-56789abcdef0")
    private val defaultTxUuid = UUID.fromString("12345678-1234-5678-1234-56789abcdef1") // Android -> Robot (write)
    private val defaultRxUuid = UUID.fromString("12345678-1234-5678-1234-56789abcdef2") // Robot -> Android (notify)

    private var serviceUuid: UUID = defaultServiceUuid
    private var txUuid: UUID = defaultTxUuid
    private var rxUuid: UUID = defaultRxUuid

    private var autoReconnect: Boolean = true
    private var targetAddress: String? = null

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var scanner: BluetoothLeScanner? = null
    private var scanCallback: ScanCallback? = null

    private var gatt: BluetoothGatt? = null
    private var txChar: BluetoothGattCharacteristic? = null
    private var rxChar: BluetoothGattCharacteristic? = null

    private var mtu: Int = 23

    private val writeQueue: ConcurrentLinkedQueue<ByteArray> = ConcurrentLinkedQueue()
    private var writing: Boolean = false

    private var lastSendMs: Long = 0
    private var estopEnabled: Boolean = false

    private val watchdogIntervalMs = 200L
    private val watchdogTimeoutMs = 500L
    private var watchdogRunning = false

    override fun load() {
        super.load()
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = manager.adapter
        scanner = bluetoothAdapter?.bluetoothLeScanner
        startWatchdog()
    }

    private fun ensurePermissions(call: PluginCall): Boolean {
        // Android 12+ requires BLUETOOTH_SCAN/CONNECT runtime permissions.
        // Pre-12 needs location for scan.
        val needsBluetooth = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
        val needsLocation = Build.VERSION.SDK_INT < Build.VERSION_CODES.S

        val bluetoothGranted = !needsBluetooth || getPermissionState("bluetooth") == PermissionState.GRANTED
        val locationGranted = !needsLocation || getPermissionState("location") == PermissionState.GRANTED

        if (bluetoothGranted && locationGranted) return true

        requestAllPermissions(call, "permissionsCallback")
        return false
    }

    @PermissionCallback
    private fun permissionsCallback(call: PluginCall) {
        if (!ensurePermissions(call)) return
        // Retry connect after permissions granted
        connect(call)
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        if (!ensurePermissions(call)) return

        serviceUuid = UUID.fromString(call.getString("serviceUuid") ?: defaultServiceUuid.toString())
        txUuid = UUID.fromString(call.getString("txUuid") ?: defaultTxUuid.toString())
        rxUuid = UUID.fromString(call.getString("rxUuid") ?: defaultRxUuid.toString())
        autoReconnect = call.getBoolean("autoReconnect", true) == true
        targetAddress = call.getString("deviceAddress")

        val adapter = bluetoothAdapter
        if (adapter == null || !adapter.isEnabled) {
            call.reject("Bluetooth indisponible ou désactivé")
            return
        }

        disconnectInternal()

        if (targetAddress != null) {
            val device = adapter.getRemoteDevice(targetAddress)
            connectGatt(device)
            call.resolve(JSObject().put("deviceName", device.name ?: "Robot"))
            return
        }

        startScan(call)
    }

    private fun startScan(call: PluginCall) {
        val leScanner = scanner ?: run {
            call.reject("Scanner BLE indisponible")
            return
        }

        val filters = listOf(
            ScanFilter.Builder()
                .setServiceUuid(ParcelUuid(serviceUuid))
                .build()
        )
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        stopScan()
        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val device = result.device ?: return
                if (device.address == null) return
                targetAddress = device.address
                stopScan()
                connectGatt(device)
                call.resolve(JSObject().put("deviceName", device.name ?: "Robot"))
            }

            override fun onScanFailed(errorCode: Int) {
                call.reject("Scan BLE échoué: $errorCode")
            }
        }

        leScanner.startScan(filters, settings, scanCallback)

        // Timeout scan
        mainHandler.postDelayed({
            if (gatt == null) {
                stopScan()
                call.reject("Scan BLE timeout (aucun robot trouvé)")
            }
        }, 10_000)
    }

    private fun stopScan() {
        val cb = scanCallback ?: return
        scanner?.stopScan(cb)
        scanCallback = null
    }

    private fun connectGatt(device: BluetoothDevice) {
        gatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                g.discoverServices()
                g.requestMtu(247)
                notifyListeners("status", JSObject().put("connected", true))
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                txChar = null
                rxChar = null
                writing = false
                writeQueue.clear()
                notifyListeners("status", JSObject().put("connected", false))
                if (autoReconnect) {
                    scheduleReconnect()
                }
            }
        }

        override fun onMtuChanged(g: BluetoothGatt, mtuValue: Int, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                mtu = mtuValue
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) return
            val service = g.getService(serviceUuid) ?: return
            txChar = service.getCharacteristic(txUuid)
            rxChar = service.getCharacteristic(rxUuid)
            enableNotificationsIfPossible(g)
        }

        override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            val bytes = characteristic.value ?: return
            val text = String(bytes, StandardCharsets.UTF_8)
            val payload = JSObject().put("text", text)
            notifyListeners("rx", payload)
        }

        override fun onCharacteristicWrite(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            writing = false
            if (status != BluetoothGatt.GATT_SUCCESS) {
                notifyListeners("rx", JSObject().put("text", "{\"type\":\"log\",\"level\":\"error\",\"message\":\"BLE write error: $status\"}"))
                writeQueue.clear()
            } else {
                writeNextChunk()
            }
        }
    }

    private fun enableNotificationsIfPossible(g: BluetoothGatt) {
        val c = rxChar ?: return
        g.setCharacteristicNotification(c, true)
        val desc = c.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")) ?: return
        desc.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        g.writeDescriptor(desc)
    }

    private fun scheduleReconnect() {
        mainHandler.postDelayed({
            val adapter = bluetoothAdapter ?: return@postDelayed
            val addr = targetAddress
            if (addr != null) {
                val dev = adapter.getRemoteDevice(addr)
                connectGatt(dev)
            }
        }, 1500)
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        autoReconnect = false
        disconnectInternal()
        call.resolve()
    }

    private fun disconnectInternal() {
        stopScan()
        try {
            gatt?.disconnect()
        } catch (_: Exception) {
        }
        try {
            gatt?.close()
        } catch (_: Exception) {
        }
        gatt = null
        txChar = null
        rxChar = null
        writing = false
        writeQueue.clear()
    }

    @PluginMethod
    fun emergencyStop(call: PluginCall) {
        estopEnabled = call.getBoolean("enabled", false) == true
        if (estopEnabled) {
            enqueuePayload(buildNeutralFrame(estop = true))
        } else {
            enqueuePayload(buildNeutralFrame(estop = false))
        }
        call.resolve()
    }

    @PluginMethod
    fun send(call: PluginCall) {
        val payload = call.getString("payload")
        if (payload == null) {
            call.reject("payload manquant")
            return
        }
        lastSendMs = System.currentTimeMillis()
        if (estopEnabled) {
            // Tant que l'estop est actif, on ignore les commandes et on renvoie des frames neutres.
            enqueuePayload(buildNeutralFrame(estop = true))
            call.resolve()
            return
        }
        enqueuePayload(payload)
        call.resolve()
    }

    private fun enqueuePayload(payload: String) {
        val bytes = payload.toByteArray(StandardCharsets.UTF_8)
        val maxChunk = (mtu - 3).coerceAtLeast(20)
        var offset = 0
        while (offset < bytes.size) {
            val len = (bytes.size - offset).coerceAtMost(maxChunk)
            val chunk = bytes.copyOfRange(offset, offset + len)
            writeQueue.add(chunk)
            offset += len
        }
        writeNextChunk()
    }

    private fun writeNextChunk() {
        if (writing) return
        val g = gatt ?: return
        val c = txChar ?: return
        val chunk = writeQueue.poll() ?: return
        writing = true
        c.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        c.value = chunk
        g.writeCharacteristic(c)
    }

    private fun startWatchdog() {
        if (watchdogRunning) return
        watchdogRunning = true
        mainHandler.postDelayed(object : Runnable {
            override fun run() {
                try {
                    val now = System.currentTimeMillis()
                    val connected = gatt != null && txChar != null
                    if (connected) {
                        val delta = now - lastSendMs
                        if (delta > watchdogTimeoutMs) {
                            enqueuePayload(buildNeutralFrame(estop = estopEnabled))
                        }
                    }
                } finally {
                    mainHandler.postDelayed(this, watchdogIntervalMs)
                }
            }
        }, watchdogIntervalMs)
    }

    private fun buildNeutralFrame(estop: Boolean): String {
        val o = JSONObject()
        o.put("v", 1)
        o.put("ts_ms", System.currentTimeMillis())
        o.put("seq", 0)
        o.put("axes", JSONObject().put("lx", 0).put("ly", 0).put("rx", 0).put("ry", 0))
        o.put("triggers", JSONObject().put("lt", 0).put("rt", 0))
        o.put(
            "buttons",
            JSONObject().put("A", false).put("B", false).put("X", false).put("Y", false).put("LB", false).put("RB", false)
        )
        o.put("dpad", JSONObject().put("up", false).put("down", false))
        o.put("safety", JSONObject().put("estop", estop))
        return o.toString()
    }
}


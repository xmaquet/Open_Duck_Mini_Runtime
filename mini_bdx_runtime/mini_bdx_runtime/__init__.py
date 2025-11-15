# Éviter d'imposer onnxruntime à l'import du package.
# Import paresseux: les utilisateurs qui en ont besoin importent directement depuis le sous-module.
try:
	from .onnx_infer import OnnxInfer  # type: ignore
except Exception:
	# Optionnel: laisser non défini pour ne pas créer de dépendance dure
	OnnxInfer = None  # type: ignore

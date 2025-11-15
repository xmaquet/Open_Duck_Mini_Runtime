import os
import argparse

from . import create_app


def main():
    parser = argparse.ArgumentParser(description="BDX Web UI server")
    parser.add_argument(
        "--host",
        default=os.environ.get("BDX_WEBUI_HOST", "0.0.0.0"),
        help="Adresse d'écoute (défaut: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("BDX_WEBUI_PORT", "8080")),
        help="Port HTTP (défaut: 8080)",
    )
    args = parser.parse_args()

    app = create_app()
    app.run(host=args.host, port=args.port)


if __name__ == "__main__":
    main()



from . import app


def start():
    app.run(port=5005, debug=True)


if __name__ == '__main__':
    start()
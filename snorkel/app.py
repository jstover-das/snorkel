import os
from flask import Flask, send_from_directory

from . import settings

app = Flask(__name__)
app.config.from_object(settings)


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico',
                               mimetype='image/vnd.microsoft.icon')

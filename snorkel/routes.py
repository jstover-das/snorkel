import logging

import requests
from flask import render_template, request

from . import app


@app.route('/')
def default():
    template_params = {
        'api_key': app.config['GOOGLE_MAPS_API_KEY'],
        'default_host': app.config['DEFAULT_HOST'],
    }
    return render_template('map.vue.html', **template_params)


def scuba_request(url: str, method: str = 'GET', payload: dict = None):
    if payload is None:
        payload = {}
    if url is None:
        return {}
    http_method = getattr(requests, method.lower())
    response = http_method(url, json=payload)
    try:
        response.raise_for_status()
        return response.json()
    except Exception as ex:
        logging.exception(ex)
        logging.error(f'response = {response.text}')
        return {'error': f'Server returned an error: {response.status_code}'}


@app.route('/catalog', methods=['POST'])
def catalog():
    url = request.json.get('catalogUrl')
    return scuba_request(url)


@app.route('/mask', methods=['POST'])
def mask():
    url = request.json.get('maskUrl')
    payload = request.json.get('payload', {})
    return scuba_request(url, 'POST', payload)

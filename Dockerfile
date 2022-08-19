FROM python:3-alpine
ENV PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

# setup gunicorn and upgrade pip
RUN pip install --progress-bar=off --no-compile --no-cache-dir --upgrade gunicorn pip
EXPOSE 5005
CMD ["gunicorn", "--bind", ":5005", "snorkel:app"]

# install application
COPY . .
RUN pip install .

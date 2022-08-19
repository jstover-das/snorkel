APP_NAME	:=	snorkel

default:

start:
	docker-compose up
	#python -m snorkel

lint-fix:
	yapf -rip $(APP_NAME)
	autoflake -ri --remove-all-unused-imports --remove-unused-variables --ignore-init-module-imports $(APP_NAME)

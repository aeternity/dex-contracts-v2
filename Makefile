PNAME := -p aedex
all:
	npm run deploy:debug
deploy:
	npm run deploy
install:
	npm install
run-node:
	docker-compose $(PNAME) up
start-node:
	docker-compose $(PNAME) up -d
stop-node:
	docker-compose $(PNAME) down -v
follow-log:
	docker-compose $(PNAME) logs -f
testAll:
	npm run test
testPair:
	npm run test:aedex-pair-break
testRouter:
	npm run test:aedex-router-break
testFactoryPool:
	npm run test:aedex-pool-factory-break
testWAE:
	npm run test:wae-break
test: testAll

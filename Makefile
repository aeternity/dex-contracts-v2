PNAME := -p aedex
all:
	node -e 'require("./deployment/deploy.js").deploy("7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d")'
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
testSetup:
	npm run test:full-setup-scenario-break
testFactoryPool:
	npm run test:aedex-pool-factory-break
testWAE:
	npm run test:wae-break
test: testAll

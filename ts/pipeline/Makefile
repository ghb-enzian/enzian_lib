# Pipeline Library Makefile
# TypeScript pipeline framework build and development tasks

# Default target
.DEFAULT_GOAL := help

# Variables
TS_FILES := $(shell find src -name "*.ts")
DIST_DIR := dist
NODE_MODULES := node_modules
COVERAGE_DIR := coverage

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

##@ Setup and Dependencies

.PHONY: install
install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Dependencies installed$(NC)"

.PHONY: clean
clean: ## Clean build artifacts and dependencies
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf $(DIST_DIR)
	rm -rf $(COVERAGE_DIR)
	rm -rf $(NODE_MODULES)
	@echo "$(GREEN)Clean complete$(NC)"

##@ Development

.PHONY: build
build: $(DIST_DIR) ## Build the TypeScript project
	@echo "$(BLUE)Building TypeScript project...$(NC)"
	npx tsc
	@echo "$(GREEN)Build complete$(NC)"

$(DIST_DIR): $(TS_FILES) tsconfig.json | $(NODE_MODULES)
	npx tsc
	@touch $(DIST_DIR)

.PHONY: dev
dev: $(NODE_MODULES) ## Start development mode with watch
	@echo "$(BLUE)Starting development mode...$(NC)"
	npx tsc --watch

.PHONY: prepare
prepare: build ## Prepare package for publishing
	@echo "$(GREEN)Package prepared$(NC)"

##@ Testing

.PHONY: test
test: $(NODE_MODULES) ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	npx jest
	@echo "$(GREEN)Tests completed$(NC)"

.PHONY: test-watch
test-watch: $(NODE_MODULES) ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	npx jest --watch

.PHONY: test-coverage
test-coverage: $(NODE_MODULES) ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npx jest --coverage
	@echo "$(GREEN)Coverage report generated in $(COVERAGE_DIR)/$(NC)"

.PHONY: test-ci
test-ci: $(NODE_MODULES) ## Run tests in CI mode (no watch, with coverage)
	@echo "$(BLUE)Running CI tests...$(NC)"
	npx jest --coverage --watchAll=false --ci
	@echo "$(GREEN)CI tests completed$(NC)"

##@ Code Quality

.PHONY: lint
lint: $(NODE_MODULES) ## Lint TypeScript files
	@echo "$(BLUE)Linting TypeScript files...$(NC)"
	npx eslint src/**/*.ts
	@echo "$(GREEN)Linting completed$(NC)"

.PHONY: lint-fix
lint-fix: $(NODE_MODULES) ## Fix linting issues automatically
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	npx eslint src/**/*.ts --fix
	@echo "$(GREEN)Linting fixes applied$(NC)"

.PHONY: typecheck
typecheck: $(NODE_MODULES) ## Type check without building
	@echo "$(BLUE)Type checking...$(NC)"
	npx tsc --noEmit
	@echo "$(GREEN)Type check passed$(NC)"

##@ Examples

.PHONY: example-basic
example-basic: build ## Run basic pipeline example
	@echo "$(BLUE)Running basic pipeline example...$(NC)"
	npx ts-node examples/basic-pipeline.ts

.PHONY: example-branching
example-branching: build ## Run branching pipeline example
	@echo "$(BLUE)Running branching pipeline example...$(NC)"
	npx ts-node examples/branching-pipeline.ts

.PHONY: example-file-processing
example-file-processing: build ## Run file processing pipeline example
	@echo "$(BLUE)Running file processing pipeline example...$(NC)"
	npx ts-node examples/file-processing.ts

.PHONY: examples
examples: example-basic example-branching example-file-processing ## Run all examples

##@ Verification

.PHONY: verify
verify: typecheck lint test ## Verify project (typecheck + lint + test)
	@echo "$(GREEN)All verification checks passed!$(NC)"

.PHONY: verify-ci
verify-ci: typecheck lint test-ci ## Full CI verification
	@echo "$(GREEN)CI verification completed!$(NC)"

##@ Documentation

.PHONY: docs
docs: ## Generate documentation (placeholder)
	@echo "$(BLUE)Documentation is in README.md$(NC)"
	@echo "$(YELLOW)API docs generation not implemented yet$(NC)"

##@ Release

.PHONY: prebuild
prebuild: clean install verify build ## Complete prebuild process
	@echo "$(GREEN)Prebuild process completed successfully$(NC)"

.PHONY: version-patch
version-patch: ## Bump patch version
	@echo "$(BLUE)Bumping patch version...$(NC)"
	npm version patch
	@echo "$(GREEN)Version bumped$(NC)"

.PHONY: version-minor
version-minor: ## Bump minor version
	@echo "$(BLUE)Bumping minor version...$(NC)"
	npm version minor
	@echo "$(GREEN)Version bumped$(NC)"

.PHONY: version-major
version-major: ## Bump major version
	@echo "$(BLUE)Bumping major version...$(NC)"
	npm version major
	@echo "$(GREEN)Version bumped$(NC)"

##@ Utilities

.PHONY: status
status: ## Show project status
	@echo "$(BLUE)Pipeline Library Status:$(NC)"
	@echo "  Dependencies: $(shell [ -d $(NODE_MODULES) ] && echo '$(GREEN)✓ Installed$(NC)' || echo '$(RED)✗ Missing$(NC)')"
	@echo "  Build: $(shell [ -d $(DIST_DIR) ] && echo '$(GREEN)✓ Built$(NC)' || echo '$(YELLOW)○ Not built$(NC)')"
	@echo "  Coverage: $(shell [ -d $(COVERAGE_DIR) ] && echo '$(GREEN)✓ Available$(NC)' || echo '$(YELLOW)○ Not generated$(NC)')"
	@echo "  Files: $(shell find src -name "*.ts" | wc -l | tr -d ' ') TypeScript files"

.PHONY: info
info: ## Show project information
	@echo "$(BLUE)Pipeline Library Information:$(NC)"
	@echo "  Name: @enzian/pipeline"
	@echo "  Version: $(shell node -p "require('./package.json').version")"
	@echo "  Description: A simple, flexible pipeline framework for TypeScript"
	@echo "  Main: $(shell node -p "require('./package.json').main")"
	@echo "  Types: $(shell node -p "require('./package.json').types")"

##@ Help

.PHONY: help
help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\n$(BLUE)Pipeline Library Makefile$(NC)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-18s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

# Ensure node_modules exists for targets that need it
$(NODE_MODULES): package.json
	npm install
	@touch $(NODE_MODULES)
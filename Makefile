.PHONY: help install run run-ios run-android run-macos run-web build build-ios build-android build-macos test test-verbose deploy-ios deploy-android clean upgrade doctor check-xcode

help:
	@echo "Image to Vector Converter - Available Commands"
	@echo ""
	@echo "Setup & Dependencies:"
	@echo "  make install        - Install Flutter dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make run           - Run the app in development mode"
	@echo "  make run-ios       - Run on iOS simulator"
	@echo "  make run-android   - Run on Android emulator"
	@echo "  make run-macos     - Run on macOS"
	@echo "  make run-web       - Run on web browser"
	@echo ""
	@echo "Building:"
	@echo "  make build         - Build for all platforms"
	@echo "  make build-ios     - Build iOS app"
	@echo "  make build-android - Build Android APK"
	@echo "  make build-macos   - Build macOS app"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run all tests"
	@echo "  make test-verbose  - Run tests with verbose output"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-ios    - Build iOS release"
	@echo "  make deploy-android- Build Android release APK"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make upgrade       - Upgrade Flutter and dependencies"
	@echo "  make doctor        - Run Flutter doctor"

check-xcode:
	@if ! command -v xcodebuild >/dev/null 2>&1; then \
		echo "ERROR: xcodebuild not found!"; \
		echo ""; \
		echo "Install Xcode Command Line Tools:"; \
		echo "  xcode-select --install"; \
		echo ""; \
		exit 1; \
	fi
	@if xcode-select -p | grep -q "CommandLineTools"; then \
		echo "ERROR: Full Xcode is required for macOS/iOS development!"; \
		echo ""; \
		echo "Current developer directory: $$(xcode-select -p)"; \
		echo ""; \
		echo "Solutions:"; \
		echo "  1. Install Xcode from the App Store"; \
		echo "  2. If Xcode is installed, set the developer directory:"; \
		echo "     sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer"; \
		echo "  3. Or use web instead: make run-web"; \
		echo ""; \
		exit 1; \
	fi

install:
	@echo "Installing Flutter dependencies..."
	flutter pub get

run: install
	@echo "Running app in development mode..."
	flutter run

run-ios: check-xcode install
	@echo "Running on iOS simulator..."
	flutter run -d ios

run-android: install
	@echo "Running on Android emulator..."
	flutter run -d android

run-macos: check-xcode install
	@echo "Running on macOS..."
	flutter run -d macos

run-web: install
	@echo "Running on web browser..."
	flutter run -d chrome

build: install
	@echo "Building for all platforms..."
	flutter build apk
	flutter build ios
	flutter build macos

build-ios: check-xcode install
	@echo "Building iOS app..."
	flutter build ios

build-android: install
	@echo "Building Android APK..."
	flutter build apk

build-macos: check-xcode install
	@echo "Building macOS app..."
	flutter build macos

test: install
	@echo "Running tests..."
	flutter test

test-verbose: install
	@echo "Running tests with verbose output..."
	flutter test --verbose

deploy-ios: check-xcode install
	@echo "Building iOS release..."
	flutter build ipa
	@echo "iOS release built successfully!"
	@echo "Find the .ipa file in: build/ios/ipa/"

deploy-android: install
	@echo "Building Android release APK..."
	flutter build apk --release
	@echo "Android release APK built successfully!"
	@echo "Find the APK in: build/app/outputs/flutter-apk/app-release.apk"

clean:
	@echo "Cleaning build artifacts..."
	flutter clean
	rm -rf build/
	@echo "Clean complete!"

upgrade:
	@echo "Upgrading Flutter..."
	flutter upgrade
	@echo "Upgrading dependencies..."
	flutter pub upgrade
	@echo "Upgrade complete!"

doctor:
	@echo "Running Flutter doctor..."
	flutter doctor -v

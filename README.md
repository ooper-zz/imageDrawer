# Image to Vector Converter

A Flutter app that converts images to vector art with animated drawing visualization.

## Features

- **Image Selection**: Pick images from your device's gallery
- **Vector Conversion**: Convert raster images to vector paths using edge detection
- **Animated Drawing**: Watch as the vector art is drawn stroke by stroke (one complete stroke at a time)
- **Adjustable Settings**: Control threshold and simplification parameters
- **Real-time Preview**: See the conversion results immediately
- **SVG Export**: Save your vector artwork as scalable SVG files
- **Web Compatible**: Runs in any modern web browser

## How It Works

1. **Image Processing**: The app converts the selected image to grayscale
2. **Edge Detection**: Uses threshold-based binary conversion to find edges
3. **Contour Tracing**: Traces contours using 8-connected neighborhood
4. **Path Simplification**: Applies Douglas-Peucker algorithm to reduce complexity
5. **Animated Rendering**: Draws the vector paths progressively to simulate hand-drawing

## Prerequisites

- **Flutter SDK**: Install from [flutter.dev](https://flutter.dev/docs/get-started/install)
- **For macOS/iOS development**: Full Xcode from the App Store (Command Line Tools alone are insufficient)
- **For web development**: Chrome browser (no additional setup needed)
- **For Android development**: Android Studio (optional)

## Installation

1. Make sure you have Flutter installed
2. **For macOS/iOS**: Install full Xcode from the App Store, then:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```
3. **For web** (easiest option): No additional setup needed
4. Clone this repository
5. Run `make install` to install dependencies
6. Run `make run-web` (web) or `make run-macos` (macOS with Xcode) to start the app

## Quick Start Commands

The project includes a Makefile for convenient command-line operations:

```bash
# Setup
make install        # Install Flutter dependencies
make doctor         # Check Flutter environment

# Development
make run           # Run app in development mode
make run-ios       # Run on iOS simulator
make run-android   # Run on Android emulator
make run-macos     # Run on macOS
make run-web       # Run on web browser

# Building
make build         # Build for all platforms
make build-ios     # Build iOS app
make build-android # Build Android APK
make build-macos   # Build macOS app

# Testing
make test          # Run all tests
make test-verbose  # Run tests with verbose output

# Deployment
make deploy-ios    # Build iOS release (.ipa)
make deploy-android# Build Android release APK

# Maintenance
make clean         # Clean build artifacts
make upgrade       # Upgrade Flutter and dependencies
make help          # Show all available commands
```

## Dependencies

- `image_picker`: For selecting images from the gallery
- `vector_graphics_compiler`: For vector graphics support
- `permission_handler`: For handling permissions

## Usage

1. Click "Choose Image" to select an image from your gallery
2. Adjust the conversion settings:
   - **Threshold**: Controls the sensitivity of edge detection (0-255)
   - **Simplification**: Controls how much the paths are simplified (0.5-10.0)
3. Click "Convert to Vector" to process the image
4. Watch the animated drawing of the vector result (draws one complete stroke at a time)
5. Use "Play" to replay the animation or "Reset" to restart
6. Click "Save as SVG" to download your vector artwork as a scalable SVG file

## Technical Details

### Vector Conversion Algorithm

The app uses a custom vector conversion pipeline:

1. **Grayscale Conversion**: Converts RGB to grayscale using standard luminance formula
2. **Binary Thresholding**: Creates a binary image based on the threshold value
3. **Contour Detection**: Uses 8-connected neighborhood tracing to find contours
4. **Path Simplification**: Applies Douglas-Peucker algorithm to reduce path complexity

### Animation System

The drawing animation uses Flutter's `AnimationController` and `CustomPainter`:

- Each vector path is drawn progressively
- Paths are sequenced to create a natural drawing flow
- A small circle indicator shows the current drawing position
- Smooth easing functions create natural movement

## License

This project is open source and available under the MIT License.

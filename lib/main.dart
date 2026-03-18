import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/services.dart';
import 'vector_converter.dart';
import 'vector_path.dart';
import 'drawing_animation.dart';
import 'svg_exporter.dart';
import 'gif_exporter.dart';
import 'dart:convert';
import 'package:universal_html/html.dart' as html;

void main() {
  runApp(const ImageToVectorApp());
}

class ImageToVectorApp extends StatelessWidget {
  const ImageToVectorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Image to Vector Converter',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with TickerProviderStateMixin {
  File? _selectedImage;
  Uint8List? _imageBytes;
  List<VectorPath>? _vectorPaths;
  bool _isProcessing = false;
  bool _isAnimating = false;
  bool _isExportingGif = false;
  double _threshold = 128.0;
  double _simplification = 2.0;
  
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 5),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() {
        _selectedImage = File(image.path);
        _imageBytes = bytes;
        _vectorPaths = null;
        _isAnimating = false;
      });
    }
  }

  Future<void> _convertToVector() async {
    if (_imageBytes == null) return;

    setState(() {
      _isProcessing = true;
      _vectorPaths = null;
      _isAnimating = false;
    });

    try {
      final codec = await ui.instantiateImageCodec(_imageBytes!);
      final frame = await codec.getNextFrame();
      final image = frame.image;

      final paths = await VectorConverter.convertToVectorPaths(
        image,
        threshold: _threshold,
        simplification: _simplification,
      );

      setState(() {
        _vectorPaths = paths;
        _isProcessing = false;
      });

      // Start animation
      _startDrawingAnimation();
    } catch (e) {
      setState(() {
        _isProcessing = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error converting image: $e')),
      );
    }
  }

  void _startDrawingAnimation() {
    if (_vectorPaths == null || _vectorPaths!.isEmpty) return;

    _animationController.reset();
    _animationController.forward();
    
    setState(() {
      _isAnimating = true;
    });
  }

  void _resetAnimation() {
    _animationController.reset();
    setState(() {
      _isAnimating = false;
    });
  }

  void _saveSvg() {
    if (_vectorPaths == null || _vectorPaths!.isEmpty) return;

    final svg = SvgExporter.exportToSvg(
      _vectorPaths!,
      width: 800,
      height: 600,
    );

    // For web: download the SVG file
    final bytes = utf8.encode(svg);
    final blob = html.Blob([bytes]);
    final url = html.Url.createObjectUrlFromBlob(blob);
    final anchor = html.document.createElement('a') as html.AnchorElement
      ..href = url
      ..style.display = 'none'
      ..download = 'vector_drawing.svg';
    html.document.body?.children.add(anchor);
    anchor.click();
    html.document.body?.children.remove(anchor);
    html.Url.revokeObjectUrl(url);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('SVG saved successfully!')),
    );
  }

  Future<void> _saveGif() async {
    if (_vectorPaths == null || _vectorPaths!.isEmpty) return;

    // Show warning dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Export GIF'),
        content: const Text(
          'Creating the animated GIF will take 10-30 seconds and may freeze the browser. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isExportingGif = true;
    });

    try {
      final gifBytes = await GifExporter.exportAnimationToGif(
        _vectorPaths!,
        width: 400,
        height: 300,
        frameCount: 30, // 30 frames (reduced for performance)
        fps: 10, // 10 fps = 3 second animation
      );

      if (gifBytes.isNotEmpty) {
        final blob = html.Blob([gifBytes]);
        final url = html.Url.createObjectUrlFromBlob(blob);
        final anchor = html.document.createElement('a') as html.AnchorElement
          ..href = url
          ..style.display = 'none'
          ..download = 'drawing_animation.gif';
        html.document.body?.children.add(anchor);
        anchor.click();
        html.document.body?.children.remove(anchor);
        html.Url.revokeObjectUrl(url);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('GIF saved successfully!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating GIF: $e')),
      );
    } finally {
      setState(() {
        _isExportingGif = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Image to Vector Converter'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image selection section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Select Image',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    if (_imageBytes != null)
                      Container(
                        height: 200,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(_imageBytes!, fit: BoxFit.contain),
                        ),
                      ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _pickImage,
                      icon: const Icon(Icons.photo_library),
                      label: const Text('Choose Image'),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Settings section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Conversion Settings',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    Text('Threshold: ${_threshold.toInt()}'),
                    Slider(
                      value: _threshold,
                      min: 0,
                      max: 255,
                      divisions: 255,
                      onChanged: (value) {
                        setState(() {
                          _threshold = value;
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    Text('Simplification: ${_simplification.toStringAsFixed(1)}'),
                    Slider(
                      value: _simplification,
                      min: 0.5,
                      max: 10.0,
                      divisions: 19,
                      onChanged: (value) {
                        setState(() {
                          _simplification = value;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Convert button
            ElevatedButton.icon(
              onPressed: _imageBytes != null && !_isProcessing
                  ? _convertToVector
                  : null,
              icon: _isProcessing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_fix_high),
              label: Text(_isProcessing ? 'Processing...' : 'Convert to Vector'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),

            const SizedBox(height: 16),

            // Vector output section
            if (_vectorPaths != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Vector Result',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      Container(
                        height: 300,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: DrawingAnimation(
                            paths: _vectorPaths!,
                            animationController: _animationController,
                            isAnimating: _isAnimating,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _startDrawingAnimation,
                              icon: const Icon(Icons.play_arrow),
                              label: const Text('Play'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _resetAnimation,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Reset'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _saveSvg,
                              icon: const Icon(Icons.image),
                              label: const Text('Save SVG'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _isExportingGif ? null : _saveGif,
                              icon: _isExportingGif
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.gif),
                              label: Text(_isExportingGif ? 'Creating...' : 'Save GIF'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.orange,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

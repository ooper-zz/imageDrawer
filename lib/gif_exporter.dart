import 'dart:ui' as ui;
import 'dart:typed_data';
import 'package:image/image.dart' as img;
import 'vector_path.dart';

class GifExporter {
  static Future<Uint8List> exportAnimationToGif(
    List<VectorPath> paths, {
    required int width,
    required int height,
    required int frameCount,
    required int fps,
  }) async {
    final frames = <img.Image>[];
    final frameDuration = (1000 / fps).round(); // milliseconds per frame
    
    // Calculate bounds
    final bounds = _calculateBounds(paths);
    if (bounds == null) {
      return Uint8List(0);
    }
    
    final padding = 20.0;
    final scaleX = (width - 2 * padding) / bounds.width;
    final scaleY = (height - 2 * padding) / bounds.height;
    final scale = scaleX < scaleY ? scaleX : scaleY;
    
    final offsetX = (width - bounds.width * scale) / 2 - bounds.left * scale;
    final offsetY = (height - bounds.height * scale) / 2 - bounds.top * scale;
    
    // Generate frames
    for (int frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      final progress = frameIndex / (frameCount - 1);
      
      // Create a frame
      final recorder = ui.PictureRecorder();
      final canvas = ui.Canvas(recorder);
      
      // White background
      final bgPaint = ui.Paint()..color = const ui.Color(0xFFFFFFFF);
      canvas.drawRect(
        ui.Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
        bgPaint,
      );
      
      canvas.translate(offsetX, offsetY);
      canvas.scale(scale, scale);
      
      // Draw paths up to current progress
      final totalPaths = paths.length;
      final completedPaths = (progress * totalPaths).floor();
      final currentPathProgress = (progress * totalPaths) - completedPaths;
      
      // Draw completed paths
      for (int i = 0; i < completedPaths && i < paths.length; i++) {
        _drawPath(canvas, paths[i], 1.0);
      }
      
      // Draw current path
      if (completedPaths < paths.length && currentPathProgress > 0) {
        _drawPath(canvas, paths[completedPaths], currentPathProgress);
      }
      
      final picture = recorder.endRecording();
      final image = await picture.toImage(width, height);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      
      if (byteData != null) {
        final pngBytes = byteData.buffer.asUint8List();
        final decodedImage = img.decodeImage(pngBytes);
        if (decodedImage != null) {
          frames.add(decodedImage);
        }
      }
    }
    
    // Create animated GIF
    if (frames.isEmpty) return Uint8List(0);
    
    // Use GifEncoder for multi-frame animation
    final encoder = img.GifEncoder();
    
    for (final frame in frames) {
      encoder.addFrame(frame, duration: frameDuration);
    }
    
    final gifBytes = encoder.finish();
    return gifBytes != null ? Uint8List.fromList(gifBytes) : Uint8List(0);
  }
  
  static void _drawPath(ui.Canvas canvas, VectorPath path, double pathProgress) {
    if (path.points.isEmpty) return;
    
    final paint = ui.Paint()
      ..color = path.color
      ..strokeWidth = path.strokeWidth
      ..style = ui.PaintingStyle.stroke
      ..strokeCap = ui.StrokeCap.round
      ..strokeJoin = ui.StrokeJoin.round;
    
    final pointsToDraw = (path.points.length * pathProgress).ceil();
    if (pointsToDraw < 1) return;
    
    final pathObj = ui.Path();
    pathObj.moveTo(path.points[0].x, path.points[0].y);
    
    for (int i = 1; i < pointsToDraw && i < path.points.length; i++) {
      pathObj.lineTo(path.points[i].x, path.points[i].y);
    }
    
    canvas.drawPath(pathObj, paint);
  }
  
  static ui.Rect? _calculateBounds(List<VectorPath> paths) {
    if (paths.isEmpty) return null;
    
    double? minX, minY, maxX, maxY;
    
    for (final path in paths) {
      for (final point in path.points) {
        minX = minX == null ? point.x : (point.x < minX! ? point.x : minX!);
        minY = minY == null ? point.y : (point.y < minY! ? point.y : minY!);
        maxX = maxX == null ? point.x : (point.x > maxX! ? point.x : maxX!);
        maxY = maxY == null ? point.y : (point.y > maxY! ? point.y : maxY!);
      }
    }
    
    if (minX == null || minY == null || maxX == null || maxY == null) return null;
    
    return ui.Rect.fromLTRB(minX!, minY!, maxX!, maxY!);
  }
}

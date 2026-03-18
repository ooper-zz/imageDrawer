import 'package:flutter/material.dart';
import 'vector_path.dart';

class DrawingAnimation extends StatefulWidget {
  final List<VectorPath> paths;
  final AnimationController animationController;
  final bool isAnimating;
  
  const DrawingAnimation({
    super.key,
    required this.paths,
    required this.animationController,
    required this.isAnimating,
  });

  @override
  State<DrawingAnimation> createState() => _DrawingAnimationState();
}

class _DrawingAnimationState extends State<DrawingAnimation> {
  late Animation<double> _animation;
  
  @override
  void initState() {
    super.initState();
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: widget.animationController,
        curve: Curves.easeInOut,
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return CustomPaint(
          painter: DrawingPainter(
            paths: widget.paths,
            progress: _animation.value,
            isAnimating: widget.isAnimating,
          ),
          child: Container(),
        );
      },
    );
  }
}

class DrawingPainter extends CustomPainter {
  final List<VectorPath> paths;
  final double progress;
  final bool isAnimating;
  
  DrawingPainter({
    required this.paths,
    required this.progress,
    required this.isAnimating,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    if (paths.isEmpty) return;
    
    // Calculate bounds and scaling
    final bounds = _calculateBounds();
    if (bounds == null) return;
    
    final padding = 20.0;
    final scaleX = (size.width - 2 * padding) / bounds.width;
    final scaleY = (size.height - 2 * padding) / bounds.height;
    final scale = scaleX < scaleY ? scaleX : scaleY;
    
    // Center the drawing
    final offsetX = (size.width - bounds.width * scale) / 2 - bounds.left * scale;
    final offsetY = (size.height - bounds.height * scale) / 2 - bounds.top * scale;
    
    canvas.translate(offsetX, offsetY);
    canvas.scale(scale, scale);
    
    // Draw paths with animation - one stroke at a time
    final totalPaths = paths.length;
    final completedPaths = (progress * totalPaths).floor();
    final currentPathProgress = (progress * totalPaths) - completedPaths;
    
    // Draw all completed paths (static, already drawn)
    for (int i = 0; i < completedPaths && i < paths.length; i++) {
      _drawCompletedPath(canvas, paths[i]);
    }
    
    // Draw ONLY the current path being animated (one stroke at a time)
    if (completedPaths < paths.length && currentPathProgress > 0) {
      _drawAnimatedPath(canvas, paths[completedPaths], currentPathProgress);
    }
  }
  
  // Draw a completed path (static, already drawn)
  void _drawCompletedPath(Canvas canvas, VectorPath path) {
    if (path.points.isEmpty) return;
    
    final paint = Paint()
      ..color = path.color
      ..strokeWidth = path.strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    
    final pathObj = Path();
    pathObj.moveTo(path.points[0].x, path.points[0].y);
    
    for (int i = 1; i < path.points.length; i++) {
      pathObj.lineTo(path.points[i].x, path.points[i].y);
    }
    
    canvas.drawPath(pathObj, paint);
  }
  
  // Draw the currently animating path (one stroke at a time)
  void _drawAnimatedPath(Canvas canvas, VectorPath path, double pathProgress) {
    if (path.points.isEmpty) return;
    
    final paint = Paint()
      ..color = path.color
      ..strokeWidth = path.strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    
    final pointsToDraw = (path.points.length * pathProgress).ceil();
    if (pointsToDraw < 1) return;
    
    final pathObj = Path();
    pathObj.moveTo(path.points[0].x, path.points[0].y);
    
    // Draw only up to the current progress point
    for (int i = 1; i < pointsToDraw && i < path.points.length; i++) {
      pathObj.lineTo(path.points[i].x, path.points[i].y);
    }
    
    canvas.drawPath(pathObj, paint);
    
    // Draw a pen indicator at the current drawing position
    if (pointsToDraw > 0 && pointsToDraw <= path.points.length) {
      final lastPoint = path.points[pointsToDraw - 1];
      
      final dotPaint = Paint()
        ..color = path.color.withOpacity(0.8)
        ..style = PaintingStyle.fill;
      
      canvas.drawCircle(
        Offset(lastPoint.x, lastPoint.y),
        path.strokeWidth * 2,
        dotPaint,
      );
    }
  }
  
  Rect? _calculateBounds() {
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
    
    return Rect.fromLTRB(minX!, minY!, maxX!, maxY!);
  }
  
  @override
  bool shouldRepaint(DrawingPainter oldDelegate) {
    return oldDelegate.progress != progress || 
           oldDelegate.isAnimating != isAnimating ||
           oldDelegate.paths != paths;
  }
}

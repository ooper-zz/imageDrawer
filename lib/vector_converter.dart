import 'dart:ui' as ui;
import 'dart:typed_data';
import 'dart:math';
import 'vector_path.dart';

class VectorConverter {
  static Future<List<VectorPath>> convertToVectorPaths(
    ui.Image image, {
    double threshold = 128.0,
    double simplification = 2.0,
  }) async {
    final width = image.width;
    final height = image.height;
    
    // Convert image to grayscale
    final byteData = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    if (byteData == null) return [];
    
    final pixels = byteData.buffer.asUint32List();
    final grayscale = List<int>.filled(width * height, 0);
    
    for (int i = 0; i < pixels.length; i++) {
      final pixel = pixels[i];
      final r = (pixel >> 16) & 0xFF;
      final g = (pixel >> 8) & 0xFF;
      final b = pixel & 0xFF;
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114).round();
    }
    
    // Apply threshold to create binary image
    final binary = List<bool>.filled(width * height, false);
    for (int i = 0; i < grayscale.length; i++) {
      binary[i] = grayscale[i] < threshold;
    }
    
    // Find contours using edge detection
    final contours = _findContours(binary, width, height);
    
    // Convert contours to vector paths
    final vectorPaths = <VectorPath>[];
    for (final contour in contours) {
      // Skip very small contours (noise/artifacts)
      if (contour.length < 5) continue;
      
      final simplifiedPath = _simplifyPath(contour, simplification);
      // Only keep paths with at least 2 points
      if (simplifiedPath.length >= 2) {
        vectorPaths.add(VectorPath(simplifiedPath));
      }
    }
    
    // Sort paths spatially for natural drawing flow
    // Start from top-left, draw nearby strokes together
    if (vectorPaths.isNotEmpty) {
      final sortedPaths = _sortPathsSpatially(vectorPaths);
      return sortedPaths;
    }
    
    return vectorPaths;
  }
  
  static List<List<Point<int>>> _findContours(List<bool> binary, int width, int height) {
    final visited = List<bool>.filled(width * height, false);
    final contours = <List<Point<int>>>[];
    
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        final index = y * width + x;
        if (binary[index] && !visited[index]) {
          final contour = _traceContour(binary, visited, x, y, width, height);
          if (contour.isNotEmpty) {
            contours.add(contour);
          }
        }
      }
    }
    
    return contours;
  }
  
  static List<Point<int>> _traceContour(
    List<bool> binary,
    List<bool> visited,
    int startX,
    int startY,
    int width,
    int height,
  ) {
    final contour = <Point<int>>[];
    final stack = <Point<int>>[Point(startX, startY)];
    
    while (stack.isNotEmpty) {
      final current = stack.removeLast();
      final x = current.x;
      final y = current.y;
      final index = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[index] || !binary[index]) {
        continue;
      }
      
      visited[index] = true;
      contour.add(current);
      
      // Check 8-connected neighbors
      for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
          if (dx == 0 && dy == 0) continue;
          final nx = x + dx;
          final ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            final nindex = ny * width + nx;
            if (binary[nindex] && !visited[nindex]) {
              stack.add(Point(nx, ny));
            }
          }
        }
      }
    }
    
    return contour;
  }
  
  static List<Point<double>> _simplifyPath(List<Point<int>> points, double tolerance) {
    if (points.length <= 2) return points.map((p) => Point(p.x.toDouble(), p.y.toDouble())).toList();
    
    // Douglas-Peucker algorithm
    return _douglasPeucker(points, 0, points.length - 1, tolerance);
  }
  
  static List<Point<double>> _douglasPeucker(
    List<Point<int>> points,
    int start,
    int end,
    double tolerance,
  ) {
    if (end <= start + 1) {
      return [
        Point(points[start].x.toDouble(), points[start].y.toDouble()),
        Point(points[end].x.toDouble(), points[end].y.toDouble()),
      ];
    }
    
    // Find the point with maximum distance
    double maxDistance = 0;
    int maxIndex = start;
    
    for (int i = start + 1; i < end; i++) {
      final distance = _perpendicularDistance(
        points[i],
        points[start],
        points[end],
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    if (maxDistance > tolerance) {
      // Recursively simplify
      final left = _douglasPeucker(points, start, maxIndex, tolerance);
      final right = _douglasPeucker(points, maxIndex, end, tolerance);
      
      // Combine results (avoid duplicate point)
      final result = <Point<double>>[
        ...left,
        ...right.skip(1),
      ];
      return result;
    } else {
      return [
        Point(points[start].x.toDouble(), points[start].y.toDouble()),
        Point(points[end].x.toDouble(), points[end].y.toDouble()),
      ];
    }
  }
  
  static double _perpendicularDistance(
    Point<int> point,
    Point<int> lineStart,
    Point<int> lineEnd,
  ) {
    final dx = lineEnd.x - lineStart.x;
    final dy = lineEnd.y - lineStart.y;
    
    if (dx == 0 && dy == 0) {
      // Line start and end are the same point
      final distX = point.x - lineStart.x;
      final distY = point.y - lineStart.y;
      return sqrt(distX * distX + distY * distY);
    }
    
    final t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
              (dx * dx + dy * dy);
    
    final closestX = lineStart.x + t * dx;
    final closestY = lineStart.y + t * dy;
    
    final distX = point.x - closestX;
    final distY = point.y - closestY;
    
    return sqrt(distX * distX + distY * distY);
  }
  
  static double _calculatePathLength(List<Point<double>> points) {
    if (points.length < 2) return 0.0;
    
    double totalLength = 0.0;
    for (int i = 1; i < points.length; i++) {
      final dx = points[i].x - points[i - 1].x;
      final dy = points[i].y - points[i - 1].y;
      totalLength += sqrt(dx * dx + dy * dy);
    }
    return totalLength;
  }
  
  static List<VectorPath> _sortPathsSpatially(List<VectorPath> paths) {
    if (paths.isEmpty) return paths;
    
    final sorted = <VectorPath>[];
    final remaining = List<VectorPath>.from(paths);
    
    // Start with the topmost-leftmost path
    remaining.sort((a, b) {
      final centerA = _getPathCenter(a.points);
      final centerB = _getPathCenter(b.points);
      final yCompare = centerA.y.compareTo(centerB.y);
      if (yCompare != 0) return yCompare;
      return centerA.x.compareTo(centerB.x);
    });
    
    sorted.add(remaining.removeAt(0));
    
    // Greedy nearest-neighbor: always pick the closest path to the last drawn path
    while (remaining.isNotEmpty) {
      final lastPath = sorted.last;
      final lastEnd = lastPath.points.last;
      
      int nearestIndex = 0;
      double nearestDistance = double.infinity;
      
      for (int i = 0; i < remaining.length; i++) {
        final pathStart = remaining[i].points.first;
        final dx = pathStart.x - lastEnd.x;
        final dy = pathStart.y - lastEnd.y;
        final distance = sqrt(dx * dx + dy * dy);
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
      
      sorted.add(remaining.removeAt(nearestIndex));
    }
    
    return sorted;
  }
  
  static Point<double> _getPathCenter(List<Point<double>> points) {
    if (points.isEmpty) return Point(0.0, 0.0);
    
    double sumX = 0.0;
    double sumY = 0.0;
    
    for (final point in points) {
      sumX += point.x;
      sumY += point.y;
    }
    
    return Point(sumX / points.length, sumY / points.length);
  }
}

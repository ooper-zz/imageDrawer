import 'dart:ui';

class Point<T> {
  final T x;
  final T y;
  
  const Point(this.x, this.y);
  
  @override
  String toString() => 'Point($x, $y)';
  
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Point && runtimeType == other.runtimeType && x == other.x && y == other.y;
  
  @override
  int get hashCode => x.hashCode ^ y.hashCode;
}

class VectorPath {
  final List<Point<double>> points;
  final Color color;
  final double strokeWidth;
  
  VectorPath(this.points, {this.color = const Color(0xFF000000), this.strokeWidth = 2.0});
  
  Path toPath() {
    final path = Path();
    if (points.isEmpty) return path;
    
    path.moveTo(points.first.x, points.first.y);
    for (int i = 1; i < points.length; i++) {
      path.lineTo(points[i].x, points[i].y);
    }
    path.close();
    
    return path;
  }
  
  VectorPath scaled(double scaleX, double scaleY) {
    final scaledPoints = points.map((p) => Point(p.x * scaleX, p.y * scaleY)).toList();
    return VectorPath(scaledPoints, color: color, strokeWidth: strokeWidth);
  }
  
  VectorPath translated(double dx, double dy) {
    final translatedPoints = points.map((p) => Point(p.x + dx, p.y + dy)).toList();
    return VectorPath(translatedPoints, color: color, strokeWidth: strokeWidth);
  }
}

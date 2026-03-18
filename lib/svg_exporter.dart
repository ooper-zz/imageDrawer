import 'vector_path.dart';

class SvgExporter {
  static String exportToSvg(List<VectorPath> paths, {
    required double width,
    required double height,
  }) {
    if (paths.isEmpty) return '';
    
    // Calculate bounds
    double? minX, minY, maxX, maxY;
    
    for (final path in paths) {
      for (final point in path.points) {
        minX = minX == null ? point.x : (point.x < minX! ? point.x : minX!);
        minY = minY == null ? point.y : (point.y < minY! ? point.y : minY!);
        maxX = maxX == null ? point.x : (point.x > maxX! ? point.x : maxX!);
        maxY = maxY == null ? point.y : (point.y > maxY! ? point.y : maxY!);
      }
    }
    
    if (minX == null || minY == null || maxX == null || maxY == null) {
      return '';
    }
    
    final viewBoxWidth = maxX! - minX!;
    final viewBoxHeight = maxY! - minY!;
    
    final buffer = StringBuffer();
    buffer.writeln('<?xml version="1.0" encoding="UTF-8"?>');
    buffer.writeln('<svg xmlns="http://www.w3.org/2000/svg" '
        'width="$width" height="$height" '
        'viewBox="$minX $minY $viewBoxWidth $viewBoxHeight">');
    
    // Add each path
    for (final path in paths) {
      if (path.points.isEmpty) continue;
      
      buffer.write('  <path d="');
      
      // Move to first point
      buffer.write('M ${path.points[0].x} ${path.points[0].y}');
      
      // Line to subsequent points
      for (int i = 1; i < path.points.length; i++) {
        buffer.write(' L ${path.points[i].x} ${path.points[i].y}');
      }
      
      buffer.write('" ');
      buffer.write('stroke="rgb(${path.color.red},${path.color.green},${path.color.blue})" ');
      buffer.write('stroke-width="${path.strokeWidth}" ');
      buffer.write('fill="none" ');
      buffer.write('stroke-linecap="round" ');
      buffer.write('stroke-linejoin="round"');
      buffer.writeln('/>');
    }
    
    buffer.writeln('</svg>');
    
    return buffer.toString();
  }
}

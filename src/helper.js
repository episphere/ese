export function euclideanDistance(pointA, pointB) {
  if (pointA.length !== pointB.length) {
    throw new Error("Points must have the same dimensions");
  }

  return Math.sqrt(
    pointA
      .map((coord, index) => Math.pow(coord - pointB[index], 2))
      .reduce((sum, squaredDiff) => sum + squaredDiff, 0)
  );
}
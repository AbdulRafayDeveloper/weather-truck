const toLatLng = (pt) => [pt.latitude, pt.longitude];

// Splits the route line into one colored segment per checkpoint. Each segment
// runs from the midpoint before its checkpoint to the midpoint after it.
export function buildCorridorSegments(geometry, checkpoints) {
  if (!Array.isArray(geometry) || geometry.length < 2) return [];

  if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
    return [{ positions: geometry.map(toLatLng), riskLevel: 'Unassessed', mileMarker: 0 }];
  }

  const anchors = snapCheckpointsToGeometry(geometry, checkpoints);
  const lastGeomIndex = geometry.length - 1;

  if (anchors.length === 1) {
    return [{
      positions: geometry.map(toLatLng),
      riskLevel: anchors[0].riskLevel,
      mileMarker: anchors[0].mileMarker,
    }];
  }

  const segments = [];
  anchors.forEach((anchor, k) => {
    const start = k === 0 ? 0 : Math.floor((anchors[k - 1].geomIndex + anchor.geomIndex) / 2);
    const end = k === anchors.length - 1
      ? lastGeomIndex
      : Math.ceil((anchor.geomIndex + anchors[k + 1].geomIndex) / 2);

    const slice = geometry.slice(start, Math.max(start + 2, end + 1));
    if (slice.length >= 2) {
      segments.push({
        positions: slice.map(toLatLng),
        riskLevel: anchor.riskLevel,
        mileMarker: anchor.mileMarker,
      });
    }
  });

  if (segments.length === 0) {
    segments.push({
      positions: geometry.map(toLatLng),
      riskLevel: checkpoints[0]?.risk?.overall_level || 'Unassessed',
      mileMarker: checkpoints[0]?.mile_marker || 0,
    });
  }

  return segments;
}

// Finds the nearest geometry point for each checkpoint. Checkpoints are in
// route order, so the search only moves forward and is capped at 1000 points.
function snapCheckpointsToGeometry(geometry, checkpoints) {
  const anchors = [];
  const lastGeomIndex = geometry.length - 1;
  let cursor = 0;

  for (let c = 0; c < checkpoints.length; c++) {
    const cp = checkpoints[c];
    if (cp.latitude == null || cp.longitude == null) continue;

    const anchor = {
      riskLevel: cp.risk?.overall_level || 'Unassessed',
      mileMarker: cp.mile_marker,
    };

    if (c === 0) {
      anchors.push({ ...anchor, geomIndex: 0 });
      continue;
    }
    if (c === checkpoints.length - 1) {
      anchors.push({ ...anchor, geomIndex: lastGeomIndex });
      break;
    }

    let bestIdx = cursor;
    let bestDist = Infinity;
    const searchEnd = Math.min(geometry.length, cursor + 1000);
    for (let g = cursor; g < searchEnd; g++) {
      const dLat = geometry[g].latitude - cp.latitude;
      const dLon = geometry[g].longitude - cp.longitude;
      const dist = dLat * dLat + dLon * dLon;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = g;
      }
    }
    cursor = bestIdx;
    anchors.push({ ...anchor, geomIndex: bestIdx });
  }

  return anchors;
}

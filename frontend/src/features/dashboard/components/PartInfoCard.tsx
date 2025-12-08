import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { PartInfo } from '../types';

interface PartInfoCardProps {
  partInfo: PartInfo;
}

export function PartInfoCard({ partInfo }: PartInfoCardProps) {
  const getCalibrationBadgeStyles = (calibrationType: string) => {
    switch (calibrationType) {
      case 'static':
        return 'bg-blue-100 text-blue-700';
      case 'dynamic':
        return 'bg-orange-100 text-orange-700';
      case 'dual':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatFeatureName = (feature: string): string => {
    return feature
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Don't show the card if there's no meaningful data
  if (
    !partInfo.nags_part_number &&
    partInfo.calibration_type === 'none' &&
    partInfo.features.length === 0 &&
    !partInfo.moulding_required &&
    !partInfo.hardware_required
  ) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Part Information
      </h3>

      <div className="space-y-4">
        {/* NAGS Part Number */}
        {partInfo.nags_part_number && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">NAGS Part #</span>
            <span className="text-sm font-mono font-medium text-gray-900">
              {partInfo.nags_part_number}
            </span>
          </div>
        )}

        {/* Calibration Type */}
        {partInfo.calibration_type && partInfo.calibration_type !== 'none' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Calibration</span>
            <Badge
              variant="secondary"
              className={getCalibrationBadgeStyles(partInfo.calibration_type)}
            >
              {partInfo.calibration_type.charAt(0).toUpperCase() +
                partInfo.calibration_type.slice(1)}
            </Badge>
          </div>
        )}

        {/* Labor Hours */}
        {partInfo.labor_hours && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">NAGS Labor Hours</span>
            <span className="text-sm font-medium text-gray-900">
              {partInfo.labor_hours} hrs
            </span>
          </div>
        )}

        {/* Moulding & Hardware */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Moulding:</span>
            <Badge
              variant="secondary"
              className={
                partInfo.moulding_required
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }
            >
              {partInfo.moulding_required ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Hardware:</span>
            <Badge
              variant="secondary"
              className={
                partInfo.hardware_required
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }
            >
              {partInfo.hardware_required ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {/* Features */}
        {partInfo.features.length > 0 && (
          <div>
            <span className="text-sm text-gray-600 block mb-2">Features</span>
            <div className="flex flex-wrap gap-2">
              {partInfo.features.map((feature) => (
                <Badge
                  key={feature}
                  variant="secondary"
                  className="bg-gray-100 text-gray-700"
                >
                  {formatFeatureName(feature)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

import type { Metadata } from 'next';
import { BedDesigner } from '@/components/designer/bed-designer';

export const metadata: Metadata = {
  title: 'Bed Designer — Claude Garden',
  description: 'Drag-and-drop garden bed planner with spacing validation.',
};

export default function DesignerPage() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <BedDesigner />
    </div>
  );
}

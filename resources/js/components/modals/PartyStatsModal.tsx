import Modal from '@/components/ui/Modal';
import type { Party } from '@/types';

interface PartyStatsModalProps {
  open: boolean;
  party: Party | null;
  onClose: () => void;
  onEdit: (p: any) => void;
}

export default function PartyStatsModal({ open, party: _party, onClose, onEdit: _onEdit }: PartyStatsModalProps) {
  return <Modal open={open} onClose={onClose} title="إحصائيات الطرف">{null}</Modal>;
}

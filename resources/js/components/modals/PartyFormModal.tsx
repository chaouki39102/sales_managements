import Modal from '@/components/ui/Modal';
import type { Party } from '@/types';

interface PartyFormModalProps {
  open: boolean;
  party: Party | null;
  initialPartyTypeId: number;
  onClose: () => void;
  onSaved: () => void;
  isSubmitting: boolean;
  onSubmit: (data: any) => void;
}

export default function PartyFormModal({ open, party: _party, initialPartyTypeId: _initialPartyTypeId, onClose, onSaved: _onSaved, isSubmitting: _isSubmitting, onSubmit: _onSubmit }: PartyFormModalProps) {
  return <Modal open={open} onClose={onClose} title="الطرف">{null}</Modal>;
}

// Types for CreateCompanyModal
export interface Company {
    id: number;
    name: string;
    slug: string;
    commercial_name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    nif?: string;
    nis?: string;
    rc?: string;
    ai?: string;
    activity?: string;
    active?: boolean;
    is_suspended?: boolean;
}

export interface FiscalYear {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
}

export interface CreateCompanyModalProps {
    onCreated: (company: Company, fiscalYear: FiscalYear) => void;
    onClose: () => void;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    subscriptionPlanId: string;
    subscriptionStatus: 'active' | 'cancelled';
    subscriptionStartDate: string;

}
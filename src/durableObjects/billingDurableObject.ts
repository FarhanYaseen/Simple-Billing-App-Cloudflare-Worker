import { DurableObject } from "cloudflare:workers";


export class BillingDurableObject extends DurableObject {
    constructor(private state: DurableObjectState, private env: any) {
        super(state, env);
    }

    async fetch(request: Request) {
        const url = new URL(request.url);
        const path = url.pathname;

        switch (path) {
            case "/get-billing-data":
                return this.getBillingData();
            case "/update-billing-data":
                return this.updateBillingData(request);
            default:
                return new Response("Not found", { status: 404 });
        }
    }

    private async getBillingData() {
        const billingData = await this.state.storage.get("billingData");
        return new Response(JSON.stringify(billingData || {}), {
            headers: { "Content-Type": "application/json" },
        });
    }

    private async updateBillingData(request: Request) {
        const newData = await request.json();
        await this.state.storage.put("billingData", newData);
        return new Response("Billing data updated successfully", { status: 200 });
    }
}
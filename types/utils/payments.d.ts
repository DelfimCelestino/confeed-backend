export declare const processPayment: (amount: number, mpesaNumber: string, paymentType: "b2c" | "c2b") => Promise<{
    response: any;
    status: any;
} | undefined>;

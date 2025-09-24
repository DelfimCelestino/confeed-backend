import { initializeMpesa } from "mpesa-connect";
import { v4 as uuidv4 } from 'uuid';
import { generateTransactionId, generateUniqueReference } from "./functions";

export const processPayment = async (amount: number, mpesaNumber: string,paymentType: "b2c" | "c2b" ) => {

    const env = process.env.NODE_ENV === "production" ? "live" : "test";
    const isProduction = process.env.NODE_ENV === "production";

    console.log({
        amount,
        mpesaNumber,
        paymentType,
        env,
        isProduction,
        nodeEnv:process.env.NODE_ENV,
        
    })

    const mpesa = initializeMpesa({
        publicKey:isProduction ? process.env.MPESA_PUBLIC_KEY : process.env.MPESA_PUBLIC_KEY_TEST,
        apiKey: isProduction ? process.env.MPESA_API_KEY : process.env.MPESA_API_KEY_TEST,
        serviceProviderCode: isProduction ? process.env.MPESA_SERVICE_PROVIDER_CODE : process.env.MPESA_SERVICE_PROVIDER_CODE_TEST,
        env, // Use 'live' para produção e 'test' para teste
      });
      const transactionId = generateTransactionId();
      const reference = generateUniqueReference();
      if(paymentType === "c2b"){
        
        console.log("C2B Payment")

        const result = await mpesa.c2b(
            transactionId, // Use the generated transaction ID
            `258${mpesaNumber}`,
            parseFloat(amount.toString()),
            reference.toString() // Use the generated reference
          );

          return result;
      }
     else if(paymentType==="b2c"){
     
        const result = await mpesa.b2c(
            transactionId, // Use the generated transaction ID
            parseFloat(`258${mpesaNumber}`).toString(),
            amount,
            reference // Use the generated reference
          );

          return result;
      }
}
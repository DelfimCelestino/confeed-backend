import axios from "axios";

// Função para enviar notificação push
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data: any = {},
  subtitle?: string
) {
  const sendPushMessage = {
    to: pushToken,
    sound: "default",
    title,
    subtitle,
    body,
    data,
  };

  try {
    await axios.post("https://exp.host/--/api/v2/push/send", sendPushMessage, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error(
      "Erro ao enviar notificação:",
      error.response?.data || error.message
    );
  }
}
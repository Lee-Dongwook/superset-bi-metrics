import { useState } from "react";
import { useParams } from "react-router-dom";
import getBootstrapData from "../../utils/bootstrap";
import { BiMetricsClient } from "@bi-metrics/core";
import { Form, Button, Card, Flex, Input, Result } from "@bi-metrics/ui";

interface RegisterForm {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Login() {
  const [form] = Form.useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [captchaResponse, setCaptchaResponse] = useState<string | null>(null);
  const { activationHash } = useParams<{ activationHash?: string }>();

  const bootstrapData = getBootstrapData();

  const authRecaptchaPublicKey: string =
    bootstrapData.common.conf.RECAPTCH_PUBLIC_KEY || "";

  if (activationHash) {
    return <></>;
  }

  const onFinish = (values: RegisterForm) => {
    setLoading(true);

    const payload = {
      username: values.username,
      first_name: values.firstName,
      last_name: values.lastName,
      email: values.email,
      password: values.password,
      conf_password: values.confirmPassword,
      "g-recaptcha-response": captchaResponse,
    };

    void BiMetricsClient.postForm("/register/form", payload, "").finally(() => {
      setLoading(false);
    });
  };
}

import { AV_TEMPLATES } from "./template/mailTemplate.js";

export const resolveTemplate = (templateId, context) => {
  const tpl = AV_TEMPLATES[templateId];
  if (!tpl) return null;

  return {
    sms: tpl.sms(context),
    subject: tpl.email?.subject(context),
    mailContent: tpl.email?.body(context),
    type: tpl.type,
  };
};

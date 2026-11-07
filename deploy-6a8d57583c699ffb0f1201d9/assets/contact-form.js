const feedback = {
  en: {
    heading: "Your enquiry",
    sending: "Sending…",
    unavailable: "Online submission is unavailable here. You can send your enquiry by email.",
    error: "We couldn’t confirm delivery. Your details are still here. Try again or send your enquiry by email.",
    email: "Open email draft",
    subject: "Website enquiry for Lakmira Plantations"
  },
  si: {
    heading: "ඔබේ විමසුම",
    sending: "යවමින් පවතී…",
    unavailable: "මෙහිදී පෝරමය හරහා විමසුම යැවීමට නොහැක. ඔබට එය විද්‍යුත් තැපෑලෙන් යැවිය හැක.",
    error: "විමසුම ලැබුණු බව තහවුරු කළ නොහැකි විය. ඔබ ඇතුළත් කළ තොරතුරු මෙහි ඇත. නැවත උත්සාහ කරන්න හෝ විද්‍යුත් තැපෑලෙන් යවන්න.",
    email: "විද්‍යුත් තැපැල් කෙටුම්පත විවෘත කරන්න",
    subject: "ලක්මිරා වැවිලි සමාගමට වෙබ් අඩවියෙන් විමසුමක්"
  }
};

function emailDraft(recipient, fields, labels, subject) {
  const body = ["name", "phone", "email", "interest", "message"]
    .filter(key => fields.get(key))
    .map(key => labels[key] + ": " + fields.get(key))
    .join("\n\n");
  return "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}

export function createContactForm(React) {
  const h = React.createElement;

  return function ContactForm({ contact, lang }) {
    const labels = contact.form;
    const copy = feedback[lang] || feedback.en;
    const [status, setStatus] = React.useState("idle");
    const [draft, setDraft] = React.useState("");
    const pending = React.useRef(false);
    const sending = status === "sending";
    const needsFallback = status === "unavailable" || status === "error";

    async function submit(event) {
      event.preventDefault();
      if (pending.current) return;
      const form = event.currentTarget;
      const fields = new FormData(form);
      setDraft(emailDraft(contact.details.email, fields, labels, copy.subject));

      // Netlify injects this input only after it has registered the static form.
      if (!document.querySelector('#contact-definition input[name="form-name"][value="contact"]')) {
        setStatus("unavailable");
        return;
      }

      pending.current = true;
      setStatus("sending");
      try {
        const response = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fields).toString()
        });
        if (!response.ok) throw new Error("Submission failed");
        form.reset();
        setDraft("");
        setStatus("sent");
      } catch {
        setStatus("error");
      } finally {
        pending.current = false;
      }
    }

    function field(name, type, required, autoComplete) {
      return h("label", null, labels[name], h("input", { name, type, required, autoComplete }));
    }

    return h("form", {
      name: "contact", className: "contact-form", method: "post", action: "/",
      "aria-labelledby": "enquiry-heading", onSubmit: submit,
      onChange: () => { if (status !== "idle" && !pending.current) setStatus("idle"); }
    },
      h("h2", { id: "enquiry-heading", className: "enquiry-heading" }, copy.heading),
      h("input", { type: "hidden", name: "form-name", value: "contact" }),
      h("input", { hidden: true, type: "text", name: "bot-field", tabIndex: -1, autoComplete: "off" }),
      h("fieldset", { disabled: sending, className: "enquiry-fields" },
        h("div", { className: "form-row" },
          field("name", "text", true, "name"),
          field("phone", "tel", true, "tel")
        ),
        field("email", "email", false, "email"),
        h("label", null, labels.interest, h("select", { name: "interest" },
          labels.interests.map(topic => h("option", { value: topic, key: topic }, topic))
        )),
        h("label", null, labels.message, h("textarea", { name: "message", rows: 5, required: true })),
        h("button", { type: "submit", className: "btn btn-primary", disabled: sending }, sending ? copy.sending : labels.submit)
      ),
      h("div", { role: "status", "aria-live": "polite" },
        status === "sent" && h("p", { className: "form-success" }, labels.sent),
        needsFallback && h("p", { className: "enquiry-delivery-note" },
          copy[status], " ", h("a", { href: draft }, copy.email)
        )
      )
    );
  };
}

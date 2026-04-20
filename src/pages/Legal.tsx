import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/ui/card";
import { useLang } from "@/i18n/LanguageProvider";

interface LegalPageProps {
  variant: "privacy" | "terms" | "about";
}

const About = ({ variant }: LegalPageProps) => {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container max-w-3xl flex-1 space-y-6 py-8">
        <BackButton to="/" />
        <Card className="space-y-4 p-6 md:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hero shadow-soft">
              <Sprout className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("app_name")}</p>
              <h1 className="font-display text-3xl font-extrabold">{t(variant)}</h1>
            </div>
          </div>

          {variant === "about" && (
            <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
              <p>
                AgriPulse is a multilingual AI crop-doctor built for smallholder farmers across India and beyond.
                Snap a photo of a leaf and receive an instant disease diagnosis in English, हिन्दी or తెలుగు,
                grounded in trusted agronomy sources from ICAR, IRRI and TNAU.
              </p>
              <p>
                We support paddy, chili and wheat today, with chemical and organic remedy guidance, severity scoring,
                and a field journal so you can track every scan over time. The app is installable on Android, iOS and PC,
                and continues to work offline once installed.
              </p>
              <p className="text-muted-foreground">
                Built with care · v1.0 · Contact{" "}
                <a className="story-link" href="mailto:siddu.dude.dev@gmail.com">siddu.dude.dev@gmail.com</a>
              </p>
            </div>
          )}

          {variant === "privacy" && (
            <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
              <p>
                <strong>What we collect.</strong> Account email, display name, your saved fields, the leaf photos you upload,
                the agronomy interview answers you submit, and the AI diagnosis returned for your scans.
              </p>
              <p>
                <strong>How we use it.</strong> Photos and answers are sent to our AI provider only to generate your diagnosis.
                Your scan history is stored privately in your account so you can review it later. We never sell your data.
              </p>
              <p>
                <strong>Storage & access.</strong> Your data lives in our secured backend. Row-level security ensures only you
                (and AgriPulse administrators handling support requests) can read your fields, scans and tickets.
              </p>
              <p>
                <strong>Your rights.</strong> You can request export or deletion of your data at any time by emailing{" "}
                <a className="story-link" href="mailto:siddu.dude.dev@gmail.com">siddu.dude.dev@gmail.com</a>.
              </p>
              <p>
                <strong>Offline mode.</strong> When you install the app, a copy of the interface is cached on your device so
                you can browse past scans without internet. New diagnoses still require a connection.
              </p>
            </div>
          )}

          {variant === "terms" && (
            <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
              <p>
                <strong>Advisory only.</strong> AgriPulse is a decision-support tool. AI diagnoses are best-effort and should
                be confirmed by a qualified agronomist or extension officer before applying chemicals.
              </p>
              <p>
                <strong>Acceptable use.</strong> Don't upload images that aren't yours, don't attempt to disrupt the service,
                and don't abuse the AI gateway with excessive automated requests.
              </p>
              <p>
                <strong>Account responsibility.</strong> Keep your login credentials safe. You're responsible for all activity
                under your account.
              </p>
              <p>
                <strong>No warranty.</strong> The service is provided "as is" without warranties of any kind. We are not liable
                for crop loss or damage arising from reliance on AI suggestions.
              </p>
              <p className="text-muted-foreground">
                Questions? <Link className="story-link" to="/tickets/new">Open a support ticket</Link> or email us.
              </p>
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default About;

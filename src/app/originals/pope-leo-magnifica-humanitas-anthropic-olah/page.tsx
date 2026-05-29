import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';

import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  title:
    "Pope Leo XIV Just Wrote a 235-Page Encyclical on AI. Anthropic's Co-Founder Was Standing Next to Him.",
  description:
    'Magnifica Humanitas dropped May 25 in Vatican City. The first papal encyclical to take AI as its central subject, signed 135 years to the day after Rerum Novarum reframed labor and capital. Pope Leo presented it personally, the first pontiff ever to do so, with Anthropic co-founder Chris Olah at his side. Inside the text, the timing against an OpenAI S-1 and a $900B Anthropic round, and what moral capital does for a frontier lab.',
  openGraph: {
    title:
      "Pope Leo XIV Just Wrote a 235-Page Encyclical on AI. Anthropic's Co-Founder Was Standing Next to Him.",
    description:
      'Magnifica Humanitas is the first papal encyclical on AI. It landed the same week as an OpenAI S-1 and a $900B Anthropic round, and Chris Olah was standing next to the pope when it was presented.',
    type: 'article',
    publishedTime: '2026-05-27T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      "Pope Leo XIV Just Wrote a 235-Page Encyclical on AI. Anthropic's Co-Founder Was Standing Next to Him.",
    description:
      'The first papal encyclical on AI landed the same week OpenAI filed its S-1 and Anthropic closed at $900B. The staging is the story.',
  },
};

export default function PopeLeoMagnificaHumanitasPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Pope Leo XIV Just Wrote a 235-Page Encyclical on AI. Anthropic's Co-Founder Was Standing Next to Him."
        description="Magnifica Humanitas dropped May 25 in Vatican City. The first papal encyclical on AI, signed 135 years to the day after Rerum Novarum, presented personally by Pope Leo XIV alongside Anthropic co-founder Chris Olah."
        datePublished="2026-05-27"
        author="Kira Nolan"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Pope Leo XIV Just Wrote a 235-Page Encyclical on AI. Anthropic&apos;s
          Co-Founder Was Standing Next to Him.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-05-27">May 27, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/pope-leo-magnifica-humanitas-anthropic-olah"
        title="Pope Leo XIV Just Wrote a 235-Page Encyclical on AI. Anthropic's Co-Founder Was Standing Next to Him."
      />

      <ArticleHero
        mode="graphic"
        icon={Scale}
        gradientFrom="#1e40af"
        gradientTo="#172554"
        eyebrow="REGULATION"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          The Holy See released Pope Leo XIV&apos;s first encyclical at the
          Vatican this morning. 235 pages, 245 paragraphs, five chapters, the
          whole thing dedicated to one subject: what artificial intelligence
          does to the human person. Magnifica Humanitas is the longest opening
          encyclical of any modern pope, and it is the first to take AI as its
          central question.
        </p>

        <p>
          That is the part the headlines will lead with. The part the headlines
          will under-read is who was standing on the dais next to him.
        </p>

        <p>
          Pope Leo XIV personally presented the document. No pope has done that
          before. The job has always gone to a cardinal or a senior curial
          figure. Today the pope took the lectern himself, and the layperson at
          his side was Chris Olah, co-founder of Anthropic. Not a head of
          state. Not a UN secretary general. The interpretability researcher
          from a frontier AI lab that is, as of this week, closing a $30
          billion round at a $900 billion valuation.
        </p>

        <p>
          You can read the encyclical for its theology. You can read it for
          its policy. I want to read it for its staging, because the staging
          is doing political work that the text alone cannot.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What Is Actually In Magnifica Humanitas
        </h2>

        <p>
          The encyclical was signed on May 15, 2026. That date is not
          incidental. It is the 135th anniversary of Rerum Novarum, the 1891
          Leo XIII text that defined Catholic social doctrine for the first
          Industrial Revolution and set the frame on labor, capital, wages,
          unions, and the obligations of property owners. Picking the name Leo
          was already a signal. Signing the AI encyclical on the Rerum Novarum
          anniversary is the same signal, twice as loud. He is telling the
          Church and everyone reading along that AI is the new industrial
          question, and that he intends to do for it what Leo XIII did for
          factory labor.
        </p>

        <p>
          The text covers a lot. Five chapters move from a historical arc of
          Catholic social teaching, to the human-dignity foundations, to
          labor, to truth, to peace and warfare. The arguments that will land
          in policy circles are concentrated in the back half:
        </p>

        <p>
          On autonomous weapons. The pope writes that AI use in war must be
          subject to &quot;the most rigorous ethical constraints&quot; and that
          it is &quot;not permissible&quot; to entrust AI systems with lethal
          decisions. He goes further than that. He says some autonomous
          weapons systems have advanced &quot;practically beyond any human
          reach to govern them.&quot; That is a Holy See document, signed by
          the pope, asserting that humans have lost meaningful control over
          deployed weapons systems. The phrasing is going to be cited in every
          arms-control hearing for the next decade.
        </p>

        <p>
          On data. He calls for &quot;wider ownership of AI data&quot; as a
          matter of justice, framing concentrated training data the same way
          Leo XIII framed concentrated capital. This is the encyclical
          quietly endorsing a distributive politics of model inputs without
          using the word distributive.
        </p>

        <p>
          On labor. Workers&apos; rights need protection in the AI transition,
          and the protection has to be active, not hopeful. The text rejects
          the technological-utopia framing and rejects the
          civilizational-collapse framing in the same breath, asking the
          reader to hold both possibilities and act as if both could happen.
        </p>

        <p>
          On children. Keep them away from the surfaces that are not safe for
          them. This is the encyclical aligning with the GUARD Act&apos;s
          framing in the United States and the EU AI Act&apos;s framing in
          Brussels at the same time.
        </p>

        <p>
          On governance. Slow down. Regulate closer. Set shared standards of
          social justice and apply them before deployment, not after harm.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why Chris Olah, Specifically
        </h2>

        <p>
          The Vatican does not pick stage partners by accident. Choosing Chris
          Olah, and not for example Sam Altman or Demis Hassabis or Dario
          Amodei or Elon Musk, says something. Olah is the interpretability
          researcher. He is the public face of the &quot;we need to understand
          what the models are doing internally&quot; school of AI safety
          inside the lab that has made interpretability and constitutional AI
          its main marketing surface.
        </p>

        <p>
          Anthropic has spent two years framing itself as the safety-first
          frontier lab. The framing is not free, it costs them compute and it
          costs them deployment speed, and we have written before about the
          ways that bet has played out commercially. Today the bet got an
          endorsement that no PR budget can buy: the universal Catholic Church
          signaled, by who it put on the lectern, that this lab&apos;s
          framing of the AI safety question is the framing it finds
          serious.
        </p>

        <p>
          That is not the same as the pope endorsing Anthropic. He did not.
          The encyclical does not name any company. But the visual is the
          visual. A frontier lab co-founder in the same camera frame as the
          pope, on the day the church takes its formal position on AI, is a
          form of moral underwriting that will follow Anthropic through every
          regulator meeting and every enterprise procurement conversation for
          years.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Week Lined Up Too Cleanly to Be Random
        </h2>

        <p>
          Look at what landed in the same five business days.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Event
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Frame
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">
                  Fri May 22
                </td>
                <td className="px-4 py-3">
                  OpenAI confidentially files S-1 with the SEC
                </td>
                <td className="px-4 py-3">
                  Distribution and capital
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">
                  Mon May 25
                </td>
                <td className="px-4 py-3">
                  Anthropic $30B round at $900B closes
                </td>
                <td className="px-4 py-3">
                  Unit economics and capital
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">
                  Mon May 25
                </td>
                <td className="px-4 py-3">
                  Magnifica Humanitas presented by Pope Leo XIV with Chris
                  Olah present
                </td>
                <td className="px-4 py-3 text-accent-primary">
                  Moral authority
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          OpenAI&apos;s answer to scale is to take the company public, with
          Goldman and Morgan Stanley leading, at a valuation somewhere between
          $852 billion and $1 trillion. The frame is American capital
          markets. The argument is &quot;we are an institution now, the
          public should own a piece.&quot;
        </p>

        <p>
          Anthropic&apos;s answer is different. Same week, comparable amount
          of capital, but raised privately, at a valuation that surpassed
          OpenAI&apos;s for the first time. And then on the same Monday,
          their co-founder is at the Vatican with the pope. The frame is
          legitimacy through gravitas rather than legitimacy through float.
        </p>

        <p>
          I do not think this is coincidence. The Vatican prepared the
          encyclical for months. Anthropic prepared its round close for
          months. The timing converges because both organizations have a
          shared interest in the answer to one question: what is the
          legitimate frame for frontier AI deployment? The pope answered it
          today. He framed AI as a moral question on the order of factory
          labor in 1891. Anthropic is the lab that has been arguing the same
          thing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What Moral Capital Actually Buys
        </h2>

        <p>
          People reading this who work in tech will roll their eyes. An
          encyclical does not change a benchmark, does not ship a model, does
          not lower a price. Fair. So let me be specific about what it does
          do.
        </p>

        <p>
          It hands regulators a vocabulary. Until today, every AI safety
          hearing was conducted in language the labs themselves invented:
          alignment, RSP, frontier model, capability evaluation. Now there is
          a 235-page document, signed by a moral authority older than the
          United States, that imports the language of Catholic social
          doctrine onto the same problem. Senators will quote it. Health
          ministers will quote it. The EU rapporteurs already drafting the
          next round of the AI Act will quote it. Vocabulary is not nothing.
          The labor movement of the twentieth century ran on Rerum Novarum
          vocabulary for decades.
        </p>

        <p>
          It binds the conversation about autonomous weapons. The pope did
          not just call them dangerous, he said they were already beyond
          governance. The Pentagon, which signed classified-network AI deals
          with OpenAI, Google, Microsoft, AWS, NVIDIA, SpaceX, and Reflection
          earlier this month (and pointedly not with Anthropic, the only
          frontier lab with a public no-weapons policy), now has to argue
          with a pope on top of arguing with arms-control NGOs. The shape of
          that argument is structurally harder.
        </p>

        <p>
          It establishes a comparison standard for safety claims. Every lab
          that pitches its safety story now has to answer the
          interpretability-and-constitution framing that Olah and Anthropic
          spent years building. The pope&apos;s presence does not validate
          the technical work, but it does validate the seriousness of the
          framing, and the framing was always going to win or lose on
          seriousness, not on benchmarks.
        </p>

        <p>
          It changes the enterprise sales motion. Catholic hospitals.
          Catholic universities. Catholic banks. Catholic charities. Roughly
          1.4 billion baptized Catholics globally, and the institutions that
          spend on their behalf are large, conservative, and risk-averse on
          ethics. Procurement at a Catholic health system that just got 245
          paragraphs of guidance is going to look very different from
          procurement at one that did not.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Counter-Read
        </h2>

        <p>
          The honest counter goes like this. Encyclicals are non-binding,
          frontier capability is set by people who have not heard of Rerum
          Novarum, and AI deployment is going to happen on the same Q3 ship
          cycles whether the Vatican signs a document or not. The labs that
          actually decide what humans build with AI are American and Chinese,
          and the American ones answer to the SEC and DARPA before they
          answer to a pope. China answered no one at all on this question.
          The encyclical is words.
        </p>

        <p>
          That read is not wrong, it is just early. Rerum Novarum was words
          too, in 1891. It did not stop the steel mills or unionize the
          docks. What it did was sit in the background of every labor fight
          for the next century and give the people doing the fighting a
          vocabulary that could not be dismissed as merely economic. It made
          the moral cost of certain choices legible to people who otherwise
          had no language for them. Magnifica Humanitas is reaching for the
          same role. It will succeed at the same delay.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Three Signposts To Watch
        </h2>

        <p>
          First, citation patterns. Watch which AI policy documents, hearings,
          and regulatory proposals start citing Magnifica Humanitas inside
          the next ninety days. Rerum Novarum took roughly five years to
          become a standard reference. The information cycle is faster now.
          If we see Senate committee citations and EU rapporteur citations
          inside three months, the encyclical is functioning as policy
          infrastructure rather than as theology.
        </p>

        <p>
          Second, lab response patterns. Watch which frontier labs publicly
          engage the text and which do not. The labs that ignore it are
          telling you they think the moral frame is not going to bind them
          commercially. The labs that engage it, especially the ones that
          quote it favorably, are telling you they have decided moral capital
          is worth more than the speed cost of acknowledging the constraint.
          Anthropic has already shown its hand by sending Olah to the
          presentation. The others have a choice to make.
        </p>

        <p>
          Third, Pentagon procurement. Anthropic is out of the May 1
          classified-network deals because of its no-weapons policy. After
          today, the pope is on the record arguing that lethal AI decisions
          are &quot;not permissible.&quot; If Anthropic finds itself back at
          the table for the next round, or if a parallel non-weapons defense
          procurement track opens up, you will know that the moral framing is
          translating into procurement reality.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Read
        </h2>

        <p>
          A pope wrote 235 pages on AI and presented them himself, breaking a
          centuries-old protocol, with a frontier-lab co-founder at his side
          on the same day his rival filed for the largest tech IPO in U.S.
          history and his preferred lab closed the largest private AI round
          on record. That is not three news items. That is one news item,
          which is that the AI industry is now negotiating with three
          authorities at once: capital markets, governments, and the Holy
          See. Until today, only two of those were in the room.
        </p>

        <p>
          We are going to be quoting Magnifica Humanitas on this site for the
          next several years. The model wars are still real. The benchmark
          fights are still real. But the layer above them, the layer where
          deployments live or die because of what the broader public thinks
          they mean, just got a new floor.
        </p>

        <p>
          The encyclical full text is at the Vatican website. The Anthropic
          round is expected to close formally this week. You can see the
          frontier lab valuations we track on our{' '}
          <Link
            href="/funding"
            className="text-accent-primary hover:underline"
          >
            funding page
          </Link>{' '}
          and the model catalog on our{' '}
          <Link
            href="/models"
            className="text-accent-primary hover:underline"
          >
            models page
          </Link>
          . Watch the citations.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Related
        </h2>
        <div className="grid gap-3">
          <Link
            href="/originals/openai-ipo-filing-anthropic-first-profit"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              OpenAI Filed for a Trillion-Dollar IPO. The Same Week Anthropic
              Booked Its First Profit.
            </span>
          </Link>
          <Link
            href="/originals/anthropic-900-billion-valuation-tops-openai"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.
            </span>
          </Link>
          <Link
            href="/originals/pentagon-blacklists-anthropic-defense-deals"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The Pentagon Skipped Anthropic. Seven Other AI Companies Got the
              Contracts.
            </span>
          </Link>
        </div>
      </footer>

      {/* Footer links */}
      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link
          href="/"
          className="text-text-muted hover:text-accent-primary transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </article>
  );
}

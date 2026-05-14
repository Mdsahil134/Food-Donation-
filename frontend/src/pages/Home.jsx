import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const stats = [
  { label: "Meals rescued (demo)", value: "128k+" },
  { label: "Partner NGOs", value: "420" },
  { label: "Cities", value: "35" },
];

const steps = [
  { title: "List surplus food", body: "Restaurants and events upload portions, expiry, and pickup details in minutes." },
  { title: "NGOs get notified", body: "Nearby shelters and volunteers see listings sorted by distance and urgency." },
  { title: "Track pickup", body: "Live route updates keep donors and NGOs aligned until the handoff is complete." },
];

const testimonials = [
  { quote: "We cut spoilage by half and built real relationships with local NGOs.", author: "Chef Amina, Bloom Bistro" },
  { quote: "Pickup tracking means our volunteers never miss a critical window.", author: "Rahul, City Care NGO" },
];

export default function Home() {
  return (
    <div>
      <section className="gradient-hero">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-teal-800 border border-teal-100 shadow-sm mb-4">
              Sustainability • Logistics • Impact
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Rescue surplus food before it expires.
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              FoodBridge connects hotels, restaurants, and events with NGOs and volunteers through secure workflows,
              real-time tracking, and DevOps-grade reliability.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-3 text-white font-semibold shadow-lg shadow-teal-500/30 hover:translate-y-[-1px] transition"
              >
                Start donating
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full border border-orange-200 bg-white px-6 py-3 text-orange-700 font-semibold hover:bg-orange-50 transition"
              >
                Register as NGO
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4">
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  whileHover={{ y: -2 }}
                  className="glass rounded-2xl p-4 text-center border border-white/60"
                >
                  <p className="text-2xl font-bold text-brand-green">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -inset-6 bg-gradient-to-tr from-teal-200/60 to-orange-200/50 blur-3xl rounded-full" />
            <div className="relative glass rounded-3xl p-6 border border-white shadow-2xl">
              <p className="text-sm font-semibold text-slate-700 mb-4">Live rescue pipeline</p>
              <div className="space-y-4">
                {["Prep surplus", "Smart expiry", "NGO match", "Tracked pickup"].map((t, i) => (
                  <div key={t} className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{t}</p>
                      <p className="text-xs text-slate-500">Automations + alerts keep everyone in sync.</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-slate-900 text-white p-4 text-sm">
                <p className="text-emerald-300 font-semibold mb-1">DevOps ready</p>
                <p className="text-slate-200">
                  Microservices, Docker, Prometheus, Grafana, ELK, and CI/CD pipelines ship with the demo stack.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl font-bold text-slate-900">How it works</h2>
          <p className="text-slate-600 mt-3">A guided flow from surplus listing to verified pickup.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, idx) => (
            <motion.div
              key={s.title}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="text-sm font-bold text-orange-500 mb-2">Step {idx + 1}</div>
              <h3 className="font-semibold text-lg text-slate-900">{s.title}</h3>
              <p className="text-slate-600 text-sm mt-2">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-emerald-50/60 border-y border-emerald-100">
        <div className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900">Built for NGO impact</h2>
            <p className="text-slate-600 mt-3">
              Role-based dashboards, audit-friendly logs in Kibana, and Grafana dashboards for operational health help
              teams prove outcomes to donors and regulators.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li>• RBAC for donors, NGOs, and platform admins</li>
              <li>• Automatic expiry handling with donor alerts</li>
              <li>• Pickup sessions with distance-to-pickup estimates</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-white border border-emerald-100 p-6 shadow-inner">
            <p className="text-xs uppercase tracking-wide text-teal-700 font-semibold">Impact snapshot</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-teal-600 text-white p-4">
                <p className="text-3xl font-bold">92%</p>
                <p className="text-sm text-teal-100">On-time pickups (demo)</p>
              </div>
              <div className="rounded-2xl bg-orange-500 text-white p-4">
                <p className="text-3xl font-bold">48m</p>
                <p className="text-sm text-orange-100">Avg. match time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-center text-slate-900">Voices from the field</h2>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <div key={t.author} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-slate-700 italic">“{t.quote}”</p>
              <p className="mt-4 text-sm font-semibold text-brand-green">{t.author}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-teal-700 to-orange-600 text-white p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl font-bold">Deploy the full stack in minutes</h3>
            <p className="text-teal-50 mt-2 max-w-xl">
              Bring up microservices, monitoring, and logging with Docker Compose — then wire your cloud registry and
              GitHub Actions pipeline.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex rounded-full bg-white text-teal-800 font-semibold px-6 py-3 shadow-lg hover:bg-teal-50"
          >
            Create your account
          </Link>
        </div>
      </section>
    </div>
  );
}

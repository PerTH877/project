import { Mail, MessageSquare, PhoneCall } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#050810] py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wider mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
            Customer <span className="text-cyan-400">Support</span>
          </h1>
          <p className="text-slate-400 text-lg">Synthetics and human agents are standing by to assist you 24/7/365.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Quick Contact Form */}
          <div className="bg-[#0a0f18] p-8 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full"></div>
            <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide relative z-10">Send a Query</h2>
            <form className="space-y-4 relative z-10" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs font-bold text-cyan-400 mb-1 uppercase tracking-wider">Subject</label>
                <input type="text" className="w-full bg-[#050810] border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-600 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="E.g. Missing Package" />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 mb-1 uppercase tracking-wider">Message</label>
                <textarea rows={4} className="w-full bg-[#050810] border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-600 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="Describe your issue..."></textarea>
              </div>
              <button className="w-full mt-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-wider rounded transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                Transmit
              </button>
            </form>
          </div>

          {/* FAQ & Quick Links */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">Comms Channels</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-[#0a0f18] p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                  <div className="bg-cyan-500/20 p-3 rounded-lg text-cyan-400 group-hover:bg-cyan-400 group-hover:text-black transition-colors">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white uppercase text-sm">Live Chat</h3>
                    <p className="text-xs text-slate-400">Connect with an agent in ~2 min</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-[#0a0f18] p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                  <div className="bg-cyan-500/20 p-3 rounded-lg text-cyan-400 group-hover:bg-cyan-400 group-hover:text-black transition-colors">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white uppercase text-sm">Voice Uplink</h3>
                    <p className="text-xs text-slate-400">1-800-PARUVO-NET</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wide">Top Queries</h2>
              <ul className="space-y-3 pt-2">
                <li className="text-slate-300 hover:text-cyan-400 cursor-pointer text-sm flex items-center justify-between border-b border-white/5 pb-2 transition-colors">
                  How do I track my order? <span className="text-cyan-400 font-bold">→</span>
                </li>
                <li className="text-slate-300 hover:text-cyan-400 cursor-pointer text-sm flex items-center justify-between border-b border-white/5 pb-2 transition-colors">
                  What is the return protocol? <span className="text-cyan-400 font-bold">→</span>
                </li>
                <li className="text-slate-300 hover:text-cyan-400 cursor-pointer text-sm flex items-center justify-between border-b border-white/5 pb-2 transition-colors">
                  Modify a premium subscription <span className="text-cyan-400 font-bold">→</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Link } from "react-router-dom";

export default function Contact() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-[#f5f7fa]" id="contact">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0f1419] mb-4">
            Corporate <span className="text-[#0a4d68]">Contact</span>
          </h2>
          <p className="text-lg text-[#64748b] max-w-2xl mx-auto">
            Reach Minera Marte S.R.L. for corporate, technical or strategic inquiries.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-[#e2e8f0] text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-lg flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-[#0f1419] mb-2">Email</h3>
            <p className="text-[#64748b] break-all">contact@minmartesrl.com</p>
          </div>

          {/* <div className="bg-white p-8 rounded-xl shadow-lg border border-[#e2e8f0] text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-lg flex items-center justify-center mx-auto mb-4">
              <Phone className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-[#0f1419] mb-2">Phone</h3>
            <p className="text-[#64748b]">+591 2 245 7788</p>
          </div> */}

          <div className="bg-white p-8 rounded-xl shadow-lg border border-[#e2e8f0] text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-lg flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-[#0f1419] mb-2">Project Region</h3>
            <p className="text-[#64748b]">Sud Lipez, Potosi, Bolivia</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12 border border-[#e2e8f0]">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-[#0f1419] mb-4">
              Access the Private Exploration Data Room
            </h3>
            <p className="text-[#64748b] mb-8">
              Authorized users can sign in to access geological and operational information.
            </p>
            <Link
              to="/login"
              className="inline-flex px-8 py-4 bg-[#0a4d68] hover:bg-[#083d54] text-white rounded-lg transition-all duration-300 items-center justify-center gap-2 font-medium"
            >
              Log In
              <Send className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

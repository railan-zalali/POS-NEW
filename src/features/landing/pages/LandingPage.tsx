import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Zap, CloudIcon, Smartphone } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-6 h-6 text-accent" />,
    title: 'Cepat & Responsif',
    description:
      'Aplikasi POS yang sangat responsif dengan performa tinggi. Waktu transaksi dijamin di bawah 2 menit per pelanggan.',
  },
  {
    icon: <CloudIcon className="w-6 h-6 text-blue-500" />,
    title: 'Local-First Architecture',
    description:
      'Bekerja 100% saat offline. Data tersimpan di perangkat lokal dan sinkronisasi ke cloud otomatis saat Anda kembali online.',
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-primary" />,
    title: 'Akurasi Stok (FIFO & FEFO)',
    description:
      'Zero selisih stok. Menjamin barang dengan masa kedaluwarsa terdekat keluar lebih dulu untuk menekan kerugian Anda.',
  },
  {
    icon: <Smartphone className="w-6 h-6 text-purple-500" />,
    title: 'Desain Modern & Intuitif',
    description:
      'Antarmuka aplikasi yang dirancang sedemikian rupa untuk kenyamanan penggunaan kasir tanpa perlu training panjang.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden font-sans">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-secondary/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[30rem] h-[30rem] bg-accent/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000"></div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
            <Leaf className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">
            Toko Tani <span className="text-primary">Makmur</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/login"
            className="px-6 py-2.5 rounded-full bg-white text-primary font-semibold border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            Masuk Kasir
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20"
          >
            ✨ Sistem POS Pertanian Generasi Baru
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight mb-8"
          >
            Kelola Toko Tani Anda <br className="hidden md:block" />
            Menjadi{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Lebih Makmur
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10"
          >
            Tinggalkan pencatatan manual. Optimalkan stok, percepat transaksi kasir, dan pantau
            laporan penjualan lengkap, bahkan saat tidak ada koneksi internet.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/login"
              className="px-8 py-4 rounded-full bg-primary text-white font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              Mulai Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Feature Highlight Mockup/Cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
          >
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="glass p-6 rounded-3xl text-left hover:-translate-y-2 transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-6 border border-slate-100">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{feature.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="text-primary w-5 h-5" />
            <span className="font-semibold text-slate-700">Toko Tani Makmur</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Aplikasi POS Toko Tani Makmur. Hak Cipta Dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}

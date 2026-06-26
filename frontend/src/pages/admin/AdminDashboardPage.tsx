import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileEdit,
  Globe,
  Trash2,
  Save,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  DollarSign,
  RefreshCw,
  Pencil,
  Search,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../context/AuthContext";
import AdminChatbotLogsView from "../../components/admin/AdminChatbotLogsView";

type AdminView = "dashboard" | "manual" | "scraping" | "chatbot" | "priceTracking";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

interface ScrapingJob {
  id: string;
  source: string;
  status: "running" | "completed" | "failed";
  phonesFound: number;
  timestamp: string;
  duration?: string;
  brand?: string;
  output?: string;
  error?: string;
}

interface PhoneSpecForm {
  name: string;
  brand: string;
  image: string;
  releaseDate: string;
  price: string;
  screenSize: string;
  resolution: string;
  refreshRate: string;
  displayType: string;
  peakBrightness: string;
  protection: string;
  // Performance
  processor: string;
  cpu: string;
  gpu: string;
  ram: string;
  storage: string;
  operatingSystem: string;
  // Benchmarks
  geekbenchSingle: string;
  geekbenchMulti: string;
  antutuScore: string;
  // Camera
  mainCamera: string;
  ultrawideMegapixels: string;
  telephotoMegapixels: string;
  frontCamera: string;
  videoRecording: string;
  batteryCapacity: string;
  chargingSpeed: string;
  batteryType: string;
  wirelessCharging: string;
  dimensions: string;
  weight: string;
  colors: string;
  materials: string;
  // Connectivity
  has5G: string;
  bluetoothVersion: string;
  hasNfc: string;
  headphoneJack: string;
  // Audio
  speakers: string;
  audioFeatures: string;
  // Sensors
  fingerprint: string;
  faceRecognition: string;
  accelerometer: string;
  gyroscope: string;
  proximity: string;
  compass: string;
  barometer: string;
}

const emptyForm: PhoneSpecForm = {
  name: "",
  brand: "",
  image: "",
  releaseDate: "",
  price: "",
  screenSize: "",
  resolution: "",
  refreshRate: "",
  displayType: "",
  peakBrightness: "",
  protection: "",
  processor: "",
  cpu: "",
  gpu: "",
  ram: "",
  storage: "",
  operatingSystem: "",
  geekbenchSingle: "",
  geekbenchMulti: "",
  antutuScore: "",
  mainCamera: "",
  ultrawideMegapixels: "",
  telephotoMegapixels: "",
  frontCamera: "",
  videoRecording: "",
  batteryCapacity: "",
  chargingSpeed: "",
  batteryType: "",
  wirelessCharging: "",
  dimensions: "",
  weight: "",
  colors: "",
  materials: "",
  has5G: "Yes",
  bluetoothVersion: "5.3",
  hasNfc: "Yes",
  headphoneJack: "No",
  speakers: "",
  audioFeatures: "",
  fingerprint: "",
  faceRecognition: "No",
  accelerometer: "Yes",
  gyroscope: "Yes",
  proximity: "Yes",
  compass: "Yes",
  barometer: "No",
};

const API_BASE_URL = "http://localhost:5001/api";

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const [formData, setFormData] = useState<PhoneSpecForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Phone list, editing, and search
  const [phones, setPhones] = useState<any[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(false);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminPage, setAdminPage] = useState(1);
  const phonesPerPage = 10;
  const [scrapingJobs, setScrapingJobs] = useState<ScrapingJob[]>([]);
  const [selectedSource] = useState("GSMArena");
  const [isScrapingRunning, setIsScrapingRunning] = useState(false);
  const [scrapeBrand, setScrapeBrand] = useState("apple");
  const [scrapeLimit, setScrapeLimit] = useState(5);
  const [pricePhoneId, setPricePhoneId] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  // Fetch all phones from database
  const fetchPhones = async () => {
    try {
      setLoadingPhones(true);
      let allPhones: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(`${API_BASE}/api/phones?page=${page}&limit=50`);
        if (!res.ok) throw new Error("Failed to fetch phones");
        const data = await res.json();
        const phones = data.data || data;
        allPhones = [...allPhones, ...phones];
        hasMore = data.pagination?.hasNextPage || false;
        page++;
      }

      setPhones(allPhones);
    } catch (err: any) {
      toast.error(err.message || "Failed to load phones");
    } finally {
      setLoadingPhones(false);
    }
  };

  // Load phones when switching to manual tab
  useEffect(() => {
    if (currentView === "manual") {
      fetchPhones();
    }
  }, [currentView]);

  const handleInputChange = (field: keyof PhoneSpecForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // handleSaveSpecs calls API
  const handleSaveSpecs = async () => {
    if (!formData.name || !formData.brand) {
      toast.error("Please fill in at least the phone name and brand");
      return;
    }

    if (!currentUser?.firebaseUser) {
      toast.error("You must be signed in to save specifications");
      return;
    }

    try {
      setIsSaving(true);
      const token = await currentUser.firebaseUser.getIdToken();

      const slug = `${formData.brand}-${formData.name}`
        .trim()
        .toLowerCase()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);

      const phoneData = {
        id: editingPhoneId || slug,
        name: formData.name,
        manufacturer: formData.brand,
        releaseDate: formData.releaseDate ? new Date(formData.releaseDate) : new Date(),
        price: parseFloat(formData.price.replace(/[^0-9.]/g, "")) || 0,
        images: { main: formData.image || "placeholder.com" },
        specs: {
          display: {
            screenSizeInches: parseFloat(formData.screenSize) || 0,
            resolution: formData.resolution || "N/A",
            technology: formData.displayType,
            refreshRateHz: parseInt(formData.refreshRate) || 60,
            peakBrightnessNits: parseInt(formData.peakBrightness) || undefined,
            protection: formData.protection || undefined,
          },
          performance: {
            processor: formData.processor || "N/A",
            cpu: formData.cpu || undefined,
            gpu: formData.gpu || undefined,
            ram: {
              options: formData.ram
                .split(/[,\/]/)
                .map((s: string) => parseInt(s))
                .filter((n: number) => !isNaN(n)),
              technology: "",
            },
            storageOptions: formData.storage
              .split(/[,\/]/)
              .map((s: string) => parseInt(s))
              .filter((n: number) => !isNaN(n)),
            operatingSystem: formData.operatingSystem || undefined,
          },
          benchmarks: {
            geekbenchSingleCore: parseInt(formData.geekbenchSingle) || 0,
            geekbenchMultiCore: parseInt(formData.geekbenchMulti) || 0,
            antutuScore: parseInt(formData.antutuScore) || 0,
          },
          camera: {
            mainMegapixels: parseInt(formData.mainCamera) || 0,
            ultrawideMegapixels: parseInt(formData.ultrawideMegapixels) || undefined,
            telephotoMegapixels: parseInt(formData.telephotoMegapixels) || undefined,
            frontMegapixels: parseInt(formData.frontCamera) || 0,
            features: formData.videoRecording
              ? formData.videoRecording
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          },
          battery: {
            capacitymAh: parseInt(formData.batteryCapacity) || 0,
            chargingSpeedW: parseInt(formData.chargingSpeed) || 0,
            batteryType: formData.batteryType || undefined,
            wirelessCharging:
              formData.wirelessCharging.toLowerCase() !== "" && formData.wirelessCharging.toLowerCase() !== "no",
          },
          design: {
            dimensionsMm: formData.dimensions,
            weightGrams: parseInt(formData.weight) || 0,
            buildMaterials: formData.materials,
            colorsAvailable: formData.colors
              ? formData.colors
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          },
          connectivity: {
            has5G: formData.has5G.toLowerCase() !== "no",
            bluetoothVersion: formData.bluetoothVersion || "5.3",
            hasNfc: formData.hasNfc.toLowerCase() !== "no",
            headphoneJack: formData.headphoneJack.toLowerCase() === "yes",
          },
          audio: {
            speakers: formData.speakers || undefined,
            hasHeadphoneJack: formData.headphoneJack.toLowerCase() === "yes",
            audioFeatures: formData.audioFeatures
              ? formData.audioFeatures
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          },
          sensors: {
            fingerprint: formData.fingerprint || undefined,
            faceRecognition: formData.faceRecognition.toLowerCase() === "yes",
            accelerometer: formData.accelerometer.toLowerCase() !== "no",
            gyroscope: formData.gyroscope.toLowerCase() !== "no",
            proximity: formData.proximity.toLowerCase() !== "no",
            compass: formData.compass.toLowerCase() !== "no",
            barometer: formData.barometer.toLowerCase() === "yes",
          },
        },
      };

      let res;
      if (editingPhoneId) {
        res = await fetch(`${API_BASE}/api/phones/${editingPhoneId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(phoneData),
        });
      } else {
        res = await fetch(`${API_BASE}/api/phones`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(phoneData),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save phone");
      }

      toast.success(
        editingPhoneId
          ? `${formData.name} updated successfully!`
          : `Specifications for ${formData.name} saved successfully!`,
      );
      setFormData(emptyForm);
      setEditingPhoneId(null);
      await fetchPhones();
    } catch (error: any) {
      toast.error(error.message || "Failed to save specifications");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPhone = async (phone: any) => {
    try {
      // Fetch full phone data before editing
      const res = await fetch(`${API_BASE}/api/phones/${phone.id}`);
      if (!res.ok) throw new Error("Failed to fetch phone details");
      const fullPhone = await res.json();

      setEditingPhoneId(fullPhone.id);
      setFormData({
        name: fullPhone.name || "",
        brand: fullPhone.manufacturer || fullPhone.brand || "",
        image: fullPhone.images?.main || "",
        releaseDate: fullPhone.releaseDate || "",
        price: fullPhone.price ? String(fullPhone.price) : "",
        screenSize: fullPhone.specs?.display?.screenSizeInches ? String(fullPhone.specs.display.screenSizeInches) : "",
        resolution: fullPhone.specs?.display?.resolution || "",
        refreshRate: fullPhone.specs?.display?.refreshRateHz ? String(fullPhone.specs.display.refreshRateHz) : "",
        displayType: fullPhone.specs?.display?.technology || "",
        peakBrightness: fullPhone.specs?.display?.peakBrightnessNits
          ? String(fullPhone.specs.display.peakBrightnessNits)
          : "",
        protection: fullPhone.specs?.display?.protection || "",
        processor: fullPhone.specs?.performance?.processor || "",
        cpu: fullPhone.specs?.performance?.cpu || "",
        gpu: fullPhone.specs?.performance?.gpu || "",
        ram: fullPhone.specs?.performance?.ram?.options?.join(", ") || "",
        storage: fullPhone.specs?.performance?.storageOptions?.join(", ") || "",
        operatingSystem: fullPhone.specs?.performance?.operatingSystem || "",
        geekbenchSingle: fullPhone.specs?.benchmarks?.geekbenchSingleCore
          ? String(fullPhone.specs.benchmarks.geekbenchSingleCore)
          : "",
        geekbenchMulti: fullPhone.specs?.benchmarks?.geekbenchMultiCore
          ? String(fullPhone.specs.benchmarks.geekbenchMultiCore)
          : "",
        antutuScore: fullPhone.specs?.benchmarks?.antutuScore ? String(fullPhone.specs.benchmarks.antutuScore) : "",
        mainCamera: fullPhone.specs?.camera?.mainMegapixels ? String(fullPhone.specs.camera.mainMegapixels) : "",
        ultrawideMegapixels: fullPhone.specs?.camera?.ultrawideMegapixels
          ? String(fullPhone.specs.camera.ultrawideMegapixels)
          : "",
        telephotoMegapixels: fullPhone.specs?.camera?.telephotoMegapixels
          ? String(fullPhone.specs.camera.telephotoMegapixels)
          : "",
        frontCamera: fullPhone.specs?.camera?.frontMegapixels ? String(fullPhone.specs.camera.frontMegapixels) : "",
        videoRecording: fullPhone.specs?.camera?.features?.join(", ") || "",
        batteryCapacity: fullPhone.specs?.battery?.capacitymAh ? String(fullPhone.specs.battery.capacitymAh) : "",
        chargingSpeed: fullPhone.specs?.battery?.chargingSpeedW ? String(fullPhone.specs.battery.chargingSpeedW) : "",
        batteryType: fullPhone.specs?.battery?.batteryType || "",
        wirelessCharging: fullPhone.specs?.battery?.wirelessCharging ? "Yes" : "No",
        dimensions: fullPhone.specs?.design?.dimensionsMm || "",
        weight: fullPhone.specs?.design?.weightGrams ? String(fullPhone.specs.design.weightGrams) : "",
        colors: fullPhone.specs?.design?.colorsAvailable?.join(", ") || "",
        materials: fullPhone.specs?.design?.buildMaterials || "",
        has5G: fullPhone.specs?.connectivity?.has5G ? "Yes" : "No",
        bluetoothVersion: fullPhone.specs?.connectivity?.bluetoothVersion || "5.3",
        hasNfc: fullPhone.specs?.connectivity?.hasNfc ? "Yes" : "No",
        headphoneJack: fullPhone.specs?.connectivity?.headphoneJack ? "Yes" : "No",
        speakers: fullPhone.specs?.audio?.speakers || "",
        audioFeatures: fullPhone.specs?.audio?.audioFeatures?.join(", ") || "",
        fingerprint: fullPhone.specs?.sensors?.fingerprint || "",
        faceRecognition: fullPhone.specs?.sensors?.faceRecognition ? "Yes" : "No",
        accelerometer: fullPhone.specs?.sensors?.accelerometer ? "Yes" : "No",
        gyroscope: fullPhone.specs?.sensors?.gyroscope ? "Yes" : "No",
        proximity: fullPhone.specs?.sensors?.proximity ? "Yes" : "No",
        compass: fullPhone.specs?.sensors?.compass ? "Yes" : "No",
        barometer: fullPhone.specs?.sensors?.barometer ? "Yes" : "No",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      toast.error(error.message || "Failed to load phone details for editing");
    }
  };

  const handleDeletePhone = async (phoneId: string, phoneName: string) => {
    if (!confirm(`Are you sure you want to delete "${phoneName}"?`)) return;
    if (!currentUser?.firebaseUser) {
      toast.error("You must be signed in to delete specifications");
      return;
    }
    try {
      const token = await currentUser.firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/phones/${phoneId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete phone");
      }
      toast.success(`${phoneName} deleted`);
      await fetchPhones();
      if (editingPhoneId === phoneId) {
        setFormData(emptyForm);
        setEditingPhoneId(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete phone");
    }
  };

  // Filter phones by search query
  const filteredPhones = phones.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [p.id, p.name, p.brand].some((v: string) => (v || "").toLowerCase().includes(q));
  });

  // Pagination
  const totalAdminPages = Math.ceil(filteredPhones.length / phonesPerPage);
  const paginatedPhones = filteredPhones.slice((adminPage - 1) * phonesPerPage, adminPage * phonesPerPage);

  const handleStartScraping = async () => {
    const cleanedBrand = scrapeBrand.trim().toLowerCase();
    if (!cleanedBrand) {
      toast.error("Please enter a brand to scrape");
      return;
    }
    if (!Number.isFinite(scrapeLimit) || scrapeLimit < 1) {
      toast.error("Please enter a valid limit");
      return;
    }
    setIsScrapingRunning(true);
    toast.info(`Starting GSMArena scrape for ${cleanedBrand}...`);

    const newJob: ScrapingJob = {
      id: Date.now().toString(),
      source: selectedSource,
      status: "running",
      phonesFound: 0,
      brand: cleanedBrand,
      timestamp: new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setScrapingJobs((prev) => [newJob, ...prev]);

    const startedAt = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/scraper/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand: cleanedBrand,
          limit: scrapeLimit,
          maxPages: 3,
          poolMult: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Scraper failed");
      }

      const elapsedMs = Date.now() - startedAt;
      const totalSeconds = Math.max(1, Math.round(elapsedMs / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      const phonesFound = typeof data.totalInserted === "number" ? data.totalInserted : 0;

      setScrapingJobs((prev) =>
        prev.map((job) =>
          job.id === newJob.id
            ? {
                ...job,
                status: "completed",
                phonesFound,
                duration,
                output: data.output || "",
              }
            : job,
        ),
      );

      toast.success(`Scraping completed! Inserted ${phonesFound} phone${phonesFound === 1 ? "" : "s"}.`);
    } catch (error: any) {
      const elapsedMs = Date.now() - startedAt;
      const totalSeconds = Math.max(1, Math.round(elapsedMs / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      setScrapingJobs((prev) =>
        prev.map((job) =>
          job.id === newJob.id
            ? {
                ...job,
                status: "failed",
                duration,
                error: error.message || "Scraper failed",
              }
            : job,
        ),
      );

      toast.error(error.message || "Scraping failed");
    } finally {
      setIsScrapingRunning(false);
    }
  };

  const handleInsertPriceHistory = async () => {
    const trimmedPhoneId = pricePhoneId.trim();
    const numericAmount = Number(priceAmount);

    if (!trimmedPhoneId) {
      toast.error("Please enter a phone ID");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Please enter a valid positive price");
      return;
    }

    setIsSubmittingPrice(true);

    try {
      const response = await fetch(`${API_BASE_URL}/phones/${trimmedPhoneId}/price-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          currency: priceCurrency || "USD",
          source: "admin-manual",
          raw: `$${numericAmount}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to insert price history");
      }

      toast.success(`Inserted new price snapshot for ${trimmedPhoneId}`);
      setPricePhoneId("");
      setPriceAmount("");
      setPriceCurrency("USD");
    } catch (error: any) {
      toast.error(error.message || "Failed to insert price history");
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  const renderSidebar = () => (
    <div className="w-64 bg-white dark:bg-[#161b26] border-r border-[#e5e5e5] dark:border-[#2d3548] min-h-screen">
      <div className="p-6 border-b border-[#e5e5e5] dark:border-[#2d3548]">
        <h2 className="text-[#2c3968] dark:text-[#4a7cf6]">Admin Panel</h2>
      </div>

      <nav className="p-4">
        <button
          onClick={() => setCurrentView("dashboard")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 cursor-pointer ${
            currentView === "dashboard"
              ? "bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md"
              : "text-[#666] dark:text-[#a0a8b8] hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
          }`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentView("manual")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 cursor-pointer ${
            currentView === "manual"
              ? "bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md"
              : "text-[#666] dark:text-[#a0a8b8] hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
          }`}
        >
          <FileEdit size={20} />
          <span>Manual Specs</span>
        </button>

        <button
          onClick={() => setCurrentView("scraping")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 cursor-pointer ${
            currentView === "scraping"
              ? "bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md"
              : "text-[#666] dark:text-[#a0a8b8] hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
          }`}
        >
          <Globe size={20} />
          <span>Web Scraping</span>
        </button>

        <button
          onClick={() => setCurrentView("priceTracking")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2  cursor-pointer ${
            currentView === "priceTracking"
              ? "bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md"
              : "text-[#666] dark:text-[#a0a8b8] hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
          }`}
        >
          <DollarSign size={20} />
          <span>Price Tracking</span>
        </button>

        <button
          onClick={() => setCurrentView("chatbot")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
            currentView === "chatbot"
              ? "bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md"
              : "text-[#666] dark:text-[#a0a8b8] hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
          }`}
        >
          <MessageSquare size={20} />
          <span>Chatbot Logs</span>
        </button>
      </nav>
    </div>
  );

  const renderDashboard = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Dashboard Overview</h1>
        <p className="text-[#666] dark:text-[#a0a8b8]">Monitor and manage phone specifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] rounded-lg flex items-center justify-center">
              <FileEdit className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-[#1e1e1e] dark:text-white mb-1">Total Phones</h3>
          <p className="text-[#666] dark:text-[#a0a8b8]">125 devices</p>
        </div>

        <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4caf50] to-[#66bb6a] rounded-lg flex items-center justify-center">
              <CheckCircle className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-[#1e1e1e] dark:text-white mb-1">Recent Updates</h3>
          <p className="text-[#666] dark:text-[#a0a8b8]">18 this week</p>
        </div>

        <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#ff9800] to-[#ffa726] rounded-lg flex items-center justify-center">
              <Globe className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-[#1e1e1e] dark:text-white mb-1">Scraping Jobs</h3>
          <p className="text-[#666] dark:text-[#a0a8b8]">{scrapingJobs.length} total</p>
        </div>

        <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#f44336] to-[#e57373] rounded-lg flex items-center justify-center">
              <Clock className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-[#1e1e1e] dark:text-white mb-1">Pending Review</h3>
          <p className="text-[#666] dark:text-[#a0a8b8]">5 items</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6">
        <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Recent Scraping Jobs</h2>
        <div className="space-y-3">
          {scrapingJobs.slice(0, 5).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between p-4 bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    job.status === "completed"
                      ? "bg-green-100 dark:bg-green-900/30"
                      : job.status === "running"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  {job.status === "completed" ? (
                    <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                  ) : job.status === "running" ? (
                    <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                  ) : (
                    <XCircle className="text-red-600 dark:text-red-400" size={20} />
                  )}
                </div>
                <div>
                  <p className="text-[#1e1e1e] dark:text-white">
                    {job.source}
                    {job.brand ? ` • ${job.brand}` : ""}
                  </p>
                  <p className="text-[#999] dark:text-[#6b7280]">{job.timestamp}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#1e1e1e] dark:text-white">{job.phonesFound} phones</p>
                <p className="text-[#999] dark:text-[#6b7280]">{job.duration}</p>
              </div>
            </div>
          ))}
          {scrapingJobs.length === 0 && <p className="text-[#999] dark:text-[#6b7280]">No scraping jobs yet.</p>}
        </div>
      </div>
    </div>
  );

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-[#d9d9d9] focus:border-[#2c3968] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 transition-all";

  const renderManualSpecs = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Manual Specification Entry</h1>
        <p className="text-[#666] dark:text-[#a0a8b8]">Add or edit phone specifications manually</p>
      </div>

      {/*Phone List Table Read */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#2c3968]">Existing Phones</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#d9d9d9]">
              <Search size={16} className="text-[#999]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phones..."
                className="outline-none text-[#1e1e1e] placeholder:text-[#999] bg-transparent"
              />
            </div>
            <button
              onClick={fetchPhones}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d9d9d9] text-[#666] hover:bg-[#f7f7f7] transition-all"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {loadingPhones ? (
          <p className="text-center py-8 text-[#999]">Loading phones...</p>
        ) : filteredPhones.length === 0 ? (
          <p className="text-center py-8 text-[#999]">
            {phones.length === 0 ? "No phones in the database yet. Add one below!" : "No phones match your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e5e5e5]">
                  <th className="px-4 py-3 text-[#666] font-medium">Brand</th>
                  <th className="px-4 py-3 text-[#666] font-medium">Name</th>
                  <th className="px-4 py-3 text-[#666] font-medium">Price</th>
                  <th className="px-4 py-3 text-[#666] font-medium">ID</th>
                  <th className="px-4 py-3 text-[#666] font-medium w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPhones.map((phone: any) => (
                  <tr key={phone.id} className="border-b border-[#f0f0f0] hover:bg-[#f7f7f7] transition-all">
                    <td className="px-4 py-3 text-[#1e1e1e]">{phone.brand}</td>
                    <td className="px-4 py-3 text-[#1e1e1e]">{phone.name}</td>
                    <td className="px-4 py-3 text-[#1e1e1e]">${phone.price?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-[#999] font-mono text-sm">{phone.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditPhone(phone)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d9d9d9] text-[#2c3968] hover:bg-[#f7f7f7] transition-all text-sm"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePhone(phone.id, phone.name)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d9d9d9] text-red-600 hover:bg-red-50 transition-all text-sm"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[#999] text-sm mt-3">
          Showing {paginatedPhones.length} of {filteredPhones.length} phone{filteredPhones.length !== 1 ? "s" : ""}
        </p>
        {totalAdminPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
              disabled={adminPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#d9d9d9] text-[#666] hover:bg-[#f7f7f7] transition-all disabled:opacity-30 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-[#666]">
              Page {adminPage} of {totalAdminPages}
            </span>
            <button
              onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
              disabled={adminPage === totalAdminPages}
              className="px-3 py-1.5 rounded-lg border border-[#d9d9d9] text-[#666] hover:bg-[#f7f7f7] transition-all disabled:opacity-30 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {editingPhoneId && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-[#2c3968]">
            Editing:{" "}
            <strong>
              {formData.brand} {formData.name}
            </strong>
          </p>
          <button
            onClick={() => {
              setFormData(emptyForm);
              setEditingPhoneId(null);
            }}
            className="text-sm text-[#666] hover:text-[#1e1e1e] transition-all"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Phone Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Galaxy S24 Ultra"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Brand *</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  placeholder="e.g., Samsung"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Release Date</label>
                <input
                  type="text"
                  value={formData.releaseDate}
                  onChange={(e) => handleInputChange("releaseDate", e.target.value)}
                  placeholder="e.g., January 2024"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Price</label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="e.g., $1,199"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Image URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => handleInputChange("image", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Display</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Screen Size</label>
                <input
                  type="text"
                  value={formData.screenSize}
                  onChange={(e) => handleInputChange("screenSize", e.target.value)}
                  placeholder="e.g., 6.8 inches"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Resolution</label>
                <input
                  type="text"
                  value={formData.resolution}
                  onChange={(e) => handleInputChange("resolution", e.target.value)}
                  placeholder="e.g., 1440 x 3120"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Refresh Rate</label>
                <input
                  type="text"
                  value={formData.refreshRate}
                  onChange={(e) => handleInputChange("refreshRate", e.target.value)}
                  placeholder="e.g., 120Hz"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Display Type</label>
                <input
                  type="text"
                  value={formData.displayType}
                  onChange={(e) => handleInputChange("displayType", e.target.value)}
                  placeholder="e.g., AMOLED"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
            </div>
            <label className="block mb-2 text-[#1e1e1e]">Peak Brightness (nits)</label>
            <input
              type="text"
              value={formData.peakBrightness}
              onChange={(e) => handleInputChange("peakBrightness", e.target.value)}
              placeholder="e.g., 2600"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-2 text-[#1e1e1e]">Screen Protection</label>
            <input
              type="text"
              value={formData.protection}
              onChange={(e) => handleInputChange("protection", e.target.value)}
              placeholder="e.g., Gorilla Glass Victus 2"
              className={inputClass}
            />
          </div>

          <div>
            <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Processor</label>
                <input
                  type="text"
                  value={formData.processor}
                  onChange={(e) => handleInputChange("processor", e.target.value)}
                  placeholder="e.g., Snapdragon 8 Gen 3"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">CPU</label>
                <input
                  type="text"
                  value={formData.cpu}
                  onChange={(e) => handleInputChange("cpu", e.target.value)}
                  placeholder="e.g., Octa-core (1x3.39 GHz)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">GPU</label>
                <input
                  type="text"
                  value={formData.gpu}
                  onChange={(e) => handleInputChange("gpu", e.target.value)}
                  placeholder="e.g., Adreno 750"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Operating System</label>
                <input
                  type="text"
                  value={formData.operatingSystem}
                  onChange={(e) => handleInputChange("operatingSystem", e.target.value)}
                  placeholder="e.g., Android 14, One UI 6.1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">RAM</label>
                <input
                  type="text"
                  value={formData.ram}
                  onChange={(e) => handleInputChange("ram", e.target.value)}
                  placeholder="e.g., 12GB"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Storage</label>
                <input
                  type="text"
                  value={formData.storage}
                  onChange={(e) => handleInputChange("storage", e.target.value)}
                  placeholder="e.g., 256GB / 512GB / 1TB"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
            </div>
          </div>
          {/* Benchmarks Specifications */}
          <div>
            <h3 className="text-[#2c3968] mb-4">Benchmarks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Geekbench Single-Core</label>
                <input
                  type="text"
                  value={formData.geekbenchSingle}
                  onChange={(e) => handleInputChange("geekbenchSingle", e.target.value)}
                  placeholder="e.g., 2200"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Geekbench Multi-Core</label>
                <input
                  type="text"
                  value={formData.geekbenchMulti}
                  onChange={(e) => handleInputChange("geekbenchMulti", e.target.value)}
                  placeholder="e.g., 7100"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">AnTuTu Score</label>
                <input
                  type="text"
                  value={formData.antutuScore}
                  onChange={(e) => handleInputChange("antutuScore", e.target.value)}
                  placeholder="e.g., 2000000"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Camera</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Main Camera</label>
                <input
                  type="text"
                  value={formData.mainCamera}
                  onChange={(e) => handleInputChange("mainCamera", e.target.value)}
                  placeholder="e.g., 200MP + 50MP + 12MP + 10MP"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Front Camera</label>
                <input
                  type="text"
                  value={formData.frontCamera}
                  onChange={(e) => handleInputChange("frontCamera", e.target.value)}
                  placeholder="e.g., 12MP"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Ultrawide Camera (MP)</label>
                <input
                  type="text"
                  value={formData.ultrawideMegapixels}
                  onChange={(e) => handleInputChange("ultrawideMegapixels", e.target.value)}
                  placeholder="e.g., 12"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Telephoto Camera (MP)</label>
                <input
                  type="text"
                  value={formData.telephotoMegapixels}
                  onChange={(e) => handleInputChange("telephotoMegapixels", e.target.value)}
                  placeholder="e.g., 10"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Video Recording</label>
                <input
                  type="text"
                  value={formData.videoRecording}
                  onChange={(e) => handleInputChange("videoRecording", e.target.value)}
                  placeholder="e.g., 8K@30fps, 4K@120fps"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Battery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Battery Capacity</label>
                <input
                  type="text"
                  value={formData.batteryCapacity}
                  onChange={(e) => handleInputChange("batteryCapacity", e.target.value)}
                  placeholder="e.g., 5000mAh"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Charging Speed</label>
                <input
                  type="text"
                  value={formData.chargingSpeed}
                  onChange={(e) => handleInputChange("chargingSpeed", e.target.value)}
                  placeholder="e.g., 45W"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Battery Type</label>
                <input
                  type="text"
                  value={formData.batteryType}
                  onChange={(e) => handleInputChange("batteryType", e.target.value)}
                  placeholder="e.g., Li-Ion"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Wireless Charging</label>
                <input
                  type="text"
                  value={formData.wirelessCharging}
                  onChange={(e) => handleInputChange("wirelessCharging", e.target.value)}
                  placeholder="e.g., 15W"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Design & Build</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Dimensions</label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) => handleInputChange("dimensions", e.target.value)}
                  placeholder="e.g., 162.3 x 79.0 x 8.6 mm"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Weight</label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  placeholder="e.g., 233g"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Available Colors</label>
                <input
                  type="text"
                  value={formData.colors}
                  onChange={(e) => handleInputChange("colors", e.target.value)}
                  placeholder="e.g., Titanium Black, Titanium Gray"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Materials</label>
                <input
                  type="text"
                  value={formData.materials}
                  onChange={(e) => handleInputChange("materials", e.target.value)}
                  placeholder="e.g., Titanium frame, Gorilla Glass Victus 2"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Connectivity */}
          <div>
            <h3 className="text-[#2c3968] mb-4">Connectivity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e]">5G Support</label>
                <select
                  value={formData.has5G}
                  onChange={(e) => handleInputChange("has5G", e.target.value)}
                  className={inputClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Bluetooth Version</label>
                <input
                  type="text"
                  value={formData.bluetoothVersion}
                  onChange={(e) => handleInputChange("bluetoothVersion", e.target.value)}
                  placeholder="e.g., 5.3"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">NFC</label>
                <select
                  value={formData.hasNfc}
                  onChange={(e) => handleInputChange("hasNfc", e.target.value)}
                  className={inputClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Headphone Jack</label>
                <select
                  value={formData.headphoneJack}
                  onChange={(e) => handleInputChange("headphoneJack", e.target.value)}
                  className={inputClass}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audio */}
          <div>
            <h3 className="text-[#2c3968] mb-4">Audio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Speakers</label>
                <input
                  type="text"
                  value={formData.speakers}
                  onChange={(e) => handleInputChange("speakers", e.target.value)}
                  placeholder="e.g., Stereo speakers tuned by AKG"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Audio Features</label>
                <input
                  type="text"
                  value={formData.audioFeatures}
                  onChange={(e) => handleInputChange("audioFeatures", e.target.value)}
                  placeholder="e.g., Dolby Atmos, 32-bit/384kHz"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Sensors */}
          <div>
            <h3 className="text-[#2c3968] mb-4">Sensors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Fingerprint</label>
                <input
                  type="text"
                  value={formData.fingerprint}
                  onChange={(e) => handleInputChange("fingerprint", e.target.value)}
                  placeholder="e.g., Ultrasonic under-display"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Face Recognition</label>
                <select
                  value={formData.faceRecognition}
                  onChange={(e) => handleInputChange("faceRecognition", e.target.value)}
                  className={inputClass}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Accelerometer</label>
                <select
                  value={formData.accelerometer}
                  onChange={(e) => handleInputChange("accelerometer", e.target.value)}
                  className={inputClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Gyroscope</label>
                <select
                  value={formData.gyroscope}
                  onChange={(e) => handleInputChange("gyroscope", e.target.value)}
                  className={inputClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Proximity</label>
                <select
                  value={formData.proximity}
                  onChange={(e) => handleInputChange("proximity", e.target.value)}
                  className={inputClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Compass</label>
                <select
                  value={formData.compass}
                  onChange={(e) => handleInputChange("compass", e.target.value)}
                  className={inputClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[#1e1e1e]">Barometer</label>
                <select
                  value={formData.barometer}
                  onChange={(e) => handleInputChange("barometer", e.target.value)}
                  className={inputClass}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-[#e5e5e5] dark:border-[#2d3548]">
            <button
              onClick={handleSaveSpecs}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all cursor-pointer"
            >
              <Save size={20} />
              {isSaving ? "Saving..." : editingPhoneId ? "Update Specifications" : "Save Specifications"}
            </button>
            <button
              onClick={() => {
                setFormData(emptyForm);
                setEditingPhoneId(null);
              }}
              className="flex items-center gap-2 px-6 py-3 border border-[#d9d9d9] dark:border-[#2d3548] text-[#666] dark:text-[#a0a8b8] rounded-lg hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] transition-all cursor-pointer"
            >
              <Trash2 size={20} />
              Clear Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWebScraping = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Web Scraping</h1>
        <p className="text-[#666] dark:text-[#a0a8b8]">
          Run the GSMArena scraper to update the staging collection with newer phones
        </p>
      </div>

      <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6 mb-6">
        <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Start New Scraping Job</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Source Website</label>
            <input
              type="text"
              value={selectedSource}
              disabled
              className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-[#f7f7f7] dark:bg-[#0f1419] text-[#666] dark:text-[#6b7280]"
            />
          </div>

          <div>
            <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Brand</label>
            <input
              type="text"
              value={scrapeBrand}
              onChange={(e) => setScrapeBrand(e.target.value)}
              placeholder="e.g., apple"
              disabled={isScrapingRunning}
              className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
            />
          </div>

          <div>
            <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Limit</label>
            <input
              type="number"
              min={1}
              max={50}
              value={scrapeLimit}
              onChange={(e) => setScrapeLimit(Number(e.target.value))}
              disabled={isScrapingRunning}
              className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleStartScraping}
            disabled={isScrapingRunning}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} />
            {isScrapingRunning ? "Running..." : "Start Scraping"}
          </button>
        </div>

        <div className="mt-6 p-4 bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-lg">
          <p className="text-[#666] dark:text-[#a0a8b8] mb-2">
            <strong className="text-[#1e1e1e] dark:text-white">Note:</strong> This runs your backend GSMArena scraper
            and upserts results into MongoDB staging.
          </p>
          <p className="text-[#999] dark:text-[#6b7280]">
            • Current destination: <code>test.scrape_output</code>
            <br />
            • Recommended use: scrape newest phones by brand
            <br />• Current parameters sent: brand, limit, maxPages=3, poolMult=5
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6">
        <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Recent Scraping Jobs</h3>

        {scrapingJobs.length === 0 ? (
          <div className="text-center py-12 text-[#999] dark:text-[#6b7280]">
            <Globe size={48} className="mx-auto mb-4 opacity-30" />
            <p>No scraping jobs yet. Start your first job above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scrapingJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 border border-[#e5e5e5] dark:border-[#2d3548] rounded-lg hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        job.status === "completed"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : job.status === "running"
                            ? "bg-blue-100 dark:bg-blue-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                      }`}
                    >
                      {job.status === "completed" ? (
                        <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                      ) : job.status === "running" ? (
                        <Clock className="text-blue-600 dark:text-blue-400 animate-spin" size={24} />
                      ) : (
                        <XCircle className="text-red-600 dark:text-red-400" size={24} />
                      )}
                    </div>

                    <div>
                      <p className="text-[#1e1e1e] dark:text-white mb-1">
                        {job.source}
                        {job.brand ? ` • ${job.brand}` : ""}
                      </p>
                      <div className="flex items-center gap-4 text-[#999] dark:text-[#6b7280] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {job.timestamp}
                        </span>
                        {job.duration && <span>Duration: {job.duration}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`mb-1 ${
                        job.status === "completed"
                          ? "text-green-600 dark:text-green-400"
                          : job.status === "running"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {job.status === "completed" ? "✓ Completed" : job.status === "running" ? "⟳ Running" : "✗ Failed"}
                    </p>
                    <p className="text-[#1e1e1e] dark:text-white">
                      {job.phonesFound} {job.phonesFound === 1 ? "phone" : "phones"} found
                    </p>
                  </div>
                </div>

                {job.output && (
                  <pre className="mt-4 p-3 bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-lg text-xs text-[#444] dark:text-[#a0a8b8] whitespace-pre-wrap overflow-x-auto">
                    {job.output}
                  </pre>
                )}

                {job.error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                    {job.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPriceTracking = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Price Tracking</h1>
        <p className="text-[#666] dark:text-[#a0a8b8]">
          Manually insert a new price snapshot for a phone to test tracking and alerts
        </p>
      </div>

      <div className="bg-white dark:bg-[#161b26] rounded-xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6">
        <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Insert Price Snapshot</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Phone ID</label>
            <input
              type="text"
              value={pricePhoneId}
              onChange={(e) => setPricePhoneId(e.target.value)}
              placeholder="e.g., samsung-x1-pro"
              disabled={isSubmittingPrice}
              className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
            />
          </div>

          <div>
            <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Price</label>
            <input
              type="number"
              min={1}
              step="0.01"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              placeholder="e.g., 749"
              disabled={isSubmittingPrice}
              className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
            />
          </div>

          <div>
            <label className="block mb-2 text-[#1e1e1e] dark:text-[#d1d5db]">Currency</label>
            <input
              type="text"
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              disabled={isSubmittingPrice}
              className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleInsertPriceHistory}
            disabled={isSubmittingPrice}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DollarSign size={20} />
            {isSubmittingPrice ? "Inserting..." : "Insert Price Snapshot"}
          </button>
        </div>

        <div className="mt-6 p-4 bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-lg">
          <p className="text-[#666] dark:text-[#a0a8b8] mb-2">
            <strong className="text-[#1e1e1e] dark:text-white">Use case:</strong> Insert a new manual price point to
            test the phone detail chart, summary cards, and future alert behavior.
          </p>
          <p className="text-[#999] dark:text-[#6b7280]">
            • Endpoint used: <code>POST /api/phones/:id/price-history</code>
            <br />• Source recorded: <code>admin-manual</code>
            <br />• Best for simulating price drops without rerunning the scraper
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-140px)] bg-[#f7f7f7] dark:bg-[#0f1419]">
      {renderSidebar()}

      <div className="flex-1 p-8">
        <div className="max-w-[1400px] mx-auto">
          {currentView === "dashboard" && renderDashboard()}
          {currentView === "manual" && renderManualSpecs()}
          {currentView === "scraping" && renderWebScraping()}
          {currentView === "priceTracking" && renderPriceTracking()}
          {currentView === "chatbot" && <AdminChatbotLogsView />}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import EditIcon from "@mui/icons-material/Edit";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState, useEffect } from "react";
import { getPT2Options } from "../../lib/product-type-mappings";

interface ProductImage {
  url: string;
  isPrimary: boolean;
  type: string;
  localImagePath?: string;
}

interface ProductResult {
  productId: string;
  title: string;
  brand: string;
  price: string;
  department: string;
  productType1: string;
  productType2: string;
  images: ProductImage[];
  url: string;
  score: number;
}

interface ExistingIngredient {
  id: string;
  displayTitle: string;
  query: string;
  productType1: string;
  brands: string[];
  materials: string[];
  usedInRecipes: number;
}

interface ProductTypeCard {
  id: string;
  label: string;
  icon: React.ReactNode;
  departments: ("Womenswear" | "Menswear")[];
  priority: "primary" | "secondary"; // primary = outfit-defining, secondary = accessories/finishing
}

interface OutfitIngredientEditorProps {
  slotIndex: number;
  department: "Womenswear" | "Menswear";
  value: {
    productTypes: string[];
    ingredientTitle: string;
    searchQuery: string;
    brands: string[];
    materials: string[];
  } | null;
  allIngredients: ({
    productTypes: string[];
    ingredientTitle: string;
    searchQuery: string;
    brands: string[];
    materials: string[];
  } | null)[];
  onChange: (value: any) => void;
  onDepartmentLock?: () => void;
}

// Real Product Type 1 categories from Nordstrom data
const productTypeCategories: ProductTypeCard[] = [
  // Primary - Outfit-defining categories (choose first)
  {
    id: "Tops",
    label: "Tops",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },
  {
    id: "Bottoms",
    label: "Bottoms",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },
  {
    id: "Dresses",
    label: "Dresses",
    icon: <CheckroomIcon />,
    departments: ["Womenswear"],
    priority: "primary",
  },
  {
    id: "Jumpsuits/Coveralls",
    label: "Jumpsuits & Rompers",
    icon: <CheckroomIcon />,
    departments: ["Womenswear"],
    priority: "primary",
  },
  {
    id: "Outerwear",
    label: "Outerwear",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },
  {
    id: "Jacket/Sportcoat",
    label: "Blazers & Sport Coats",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },
  {
    id: "Suits/Sets/Wardrobes",
    label: "Suits & Separates",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },
  {
    id: "Swimwear",
    label: "Swimwear",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },
  {
    id: "Shoes",
    label: "Shoes",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary", // REQUIRED for every outfit
  },

  // Secondary - Accessories & Finishing (available after first slot)
  {
    id: "Bags",
    label: "Bags",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Belts & Braces",
    label: "Belts",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Eyewear",
    label: "Eyewear",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Gloves/Mittens",
    label: "Gloves",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Headwear",
    label: "Hats",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Hosiery",
    label: "Hosiery",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Jewelry",
    label: "Jewelry",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Neckwear",
    label: "Ties & Pocket Squares",
    icon: <CheckroomIcon />,
    departments: ["Menswear"],
    priority: "secondary",
  },
  {
    id: "Scarves/Wraps/Ponchos",
    label: "Scarves & Wraps",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Sleepwear",
    label: "Sleepwear",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Small Leather Goods",
    label: "Wallets",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Underwear/Lingerie",
    label: "Underwear & Lingerie",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
];

// Mock data for filters
const availableBrands = [
  "Alo",
  "Madewell",
  "SPANX®",
  "vuori",
  "Zella",
  "Theory",
  "Vince",
  "Equipment",
  "Eileen Fisher",
  "Rag & Bone",
  "Levi's",
  "Agolde",
  "Citizens of Humanity",
  "Paige",
  "Mother",
  "J.Crew",
  "Everlane",
];

// Real Product Type 2 subcategories from Nordstrom filter data
const availableMaterials = [
  // Tops subcategories
  "Blouse/Top",
  "Dress-shirt",
  "Polo",
  "Shirt",
  "Shirtjacket",
  "Sports Jersey",
  "Sportshirt",
  "Sweater",
  "Sweatshirt",
  "Sweatshirt/Hoody/Zipfront",
  "T-shirt/Tee",
  "Tank/Cami/Shell",
  "Tunic",

  // Bottoms subcategories
  "Pant",
  "Short",
  "Skirt",
  "Stirrup/Legging",

  // Dresses subcategories
  "Dress",
  "Gown",
  "Jumper",

  // Shoes subcategories
  "Aquatic",
  "Athletic",
  "Boots",
  "Clogs",
  "Flats",
  "Galoshes/Overshoes",
  "Loafers",
  "Mule",
  "Oxfords",
  "Pumps",
  "Sandals/Slides",
  "Slip on",
  "Slippers",
  "Sneaker",

  // Outerwear subcategories
  "3/4 or Long Coat",
  "Anorak/Parka",
  "Blazer",
  "Jacket/Coat",
  "Poncho/Cape",
  "Raincoat",
  "Short Jacket/Coat",
  "Snowpant",
  "Snowsuit",
  "Vest",

  // Jacket/Sportcoat subcategories
  "Bolero",
  "Jacket",
  "Sportcoat",

  // Bags subcategories
  "Backpack",
  "Briefcase",
  "Clutch",
  "Computer Bag/Case",
  "Crossbody",
  "Gym bag",
  "Messenger bag",
  "Tote",
  "Waist Bag",

  // Swimwear subcategories
  "Cover-up",
  "Pareo/sarong",
  "Swim bottom",
  "Swim top",
  "Swim trunk",
  "Swimsuit (complete)",

  // Jewelry subcategories
  "Bracelet",
  "Cufflink",
  "Earring",
  "Necklace",
  "Ring",
  "Tie Clip",
  "Watch",

  // Sleepwear subcategories
  "Bottom",
  "Nightgown",
  "Pajama Bottom",
  "Pajama Set",
  "Pajama Top",
  "Robe",
  "Set",
  "Sleeper",
  "Top",

  // Suits subcategories
  "Pant Set",
  "Skirt Set",
  "Sweatsuit/Warm-ups",
  "Tailored Suit",
  "Tuxedo",

  // Jumpsuits subcategories
  "Coverall",
  "Jumpsuit/Romper",
  "Onesie",
  "Overall/Shortall",

  // Eyewear subcategories
  "Eyewear Accessories",
  "Goggles",
  "Reading glasses",
  "Sunglasses",

  // Headwear subcategories
  "Cap",
  "Earmuffs",
  "Hat",
  "Helmet",
  "Visor",

  // Neckwear subcategories
  "Bow Ties",
  "Long Ties",
  "Pocket Squares",
  "Tie",

  // Scarves subcategories
  "Bandana",
  "Scarves",
  "Wraps",

  // Other
  "Belts",
  "Gloves",
  "Mittens",
  "Socks",
  "Wallets",
  "Camisole",
].sort();

// Mock existing ingredients - would come from Sanity
const existingIngredients: ExistingIngredient[] = [
  {
    id: "1",
    displayTitle: "High Waist Flare Jeans",
    query: "high waist flare leg blue denim jeans",
    productType1: "Bottoms",
    brands: ["Alo", "Madewell", "SPANX®", "vuori", "Zella"],
    materials: ["Pant"],
    usedInRecipes: 3,
  },
  {
    id: "2",
    displayTitle: "Oversized Printed Cardigan",
    query: "oversized printed pattern button-up cardigan",
    productType1: "Tops",
    brands: ["Theory", "Vince"],
    materials: ["Sweater"],
    usedInRecipes: 2,
  },
  {
    id: "3",
    displayTitle: "Silk Blouses - Neutral Tones",
    query: "silk blouse",
    productType1: "Tops",
    brands: ["Theory", "Vince", "Equipment"],
    materials: ["Blouse/Top"],
    usedInRecipes: 5,
  },
  {
    id: "4",
    displayTitle: "Casual Summer Dresses",
    query: "casual midi dress cotton blend",
    productType1: "Dresses",
    brands: ["Madewell", "Everlane"],
    materials: ["Dress"],
    usedInRecipes: 4,
  },
  {
    id: "5",
    displayTitle: "Leather Ankle Boots",
    query: "leather ankle boots black brown",
    productType1: "Shoes",
    brands: ["Rag & Bone"],
    materials: ["Boots"],
    usedInRecipes: 7,
  },
];

export default function OutfitIngredientEditor({
  slotIndex,
  department,
  value,
  allIngredients,
  onChange,
  onDepartmentLock,
}: OutfitIngredientEditorProps) {
  const [localValue, setLocalValue] = useState(
    value || {
      productTypes: [],
      ingredientTitle: "",
      searchQuery: "",
      brands: [],
      materials: [],
    },
  );

  const [isLocked, setIsLocked] = useState(false);
  const [lockedIngredient, setLockedIngredient] =
    useState<ExistingIngredient | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]); // PT2 selection
  const [pt2Confirmed, setPt2Confirmed] = useState(false); // Track if Continue was clicked on PT2
  const [searchText, setSearchText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isTitleCustom, setIsTitleCustom] = useState(false);
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true); // CLIP semantic search by default

  const hasProductType = localValue.productTypes.length > 0;

  // Category rules: which categories allow multiple items in one outfit
  const allowsMultiples = (categoryId: string): boolean => {
    const multiplesAllowed = [
      "Tops", // Can layer multiple tops/shirts
      "Necklaces",
      "Bracelets",
      "Rings",
      "Scarves",
    ];
    return multiplesAllowed.includes(categoryId);
  };

  // Special rule: Dresses and Bottoms can coexist (layering)
  const canCoexist = (cat1: string, cat2: string): boolean => {
    return (cat1 === "Dresses" && cat2 === "Bottoms") ||
           (cat1 === "Bottoms" && cat2 === "Dresses");
  };

  // Convert category label to singular/or form for headlines
  const toSingularForm = (label: string): string => {
    // Replace & and "and" with "or"
    let result = label.replace(/ & /g, " or ").replace(/ and /g, " or ");

    // Special cases
    const specialCases: Record<string, string> = {
      "Scarves": "scarf",
      "Ties": "tie",
      "Accessories": "accessory",
      "Hair Accessories": "hair accessory",
    };

    if (specialCases[result]) {
      return specialCases[result];
    }

    // Handle plural "or" phrases (e.g., "Jumpsuits or Rompers" -> "jumpsuit or romper")
    if (result.includes(" or ")) {
      const parts = result.split(" or ");
      const singularParts = parts.map(part => {
        part = part.trim();
        if (specialCases[part]) return specialCases[part];
        // Pluralization rules
        if (part.endsWith("ies")) return part.slice(0, -3) + "y";
        // True "es" plurals (watch→watches, dress→dresses)
        if (part.endsWith("ches") || part.endsWith("shes") || part.endsWith("sses") || part.endsWith("xes") || part.endsWith("zes")) {
          return part.slice(0, -2);
        }
        // Other "es" endings like "oes", "tes", "ves" - just remove "s"
        if (part.endsWith("es")) return part.slice(0, -1);
        // Simple "s" plural
        if (part.endsWith("s")) return part.slice(0, -1);
        return part;
      });
      return singularParts.join(" or ");
    }

    // Standard plural to singular conversion
    if (result.endsWith("ies")) return result.slice(0, -3) + "y";
    // True "es" plurals (watch→watches, dress→dresses)
    if (result.endsWith("ches") || result.endsWith("shes") || result.endsWith("sses") || result.endsWith("xes") || result.endsWith("zes")) {
      return result.slice(0, -2);
    }
    // Other "es" endings like "oes", "tes", "ves" - just remove "s"
    if (result.endsWith("es")) return result.slice(0, -1);
    // Simple "s" plural
    if (result.endsWith("s")) return result.slice(0, -1);

    return result;
  };

  // Reset state when slotIndex changes (switching between slots)
  useEffect(() => {
    console.log('[OutfitIngredientEditor] useEffect triggered', {
      slotIndex,
      value,
      'value.productTypes': value?.productTypes,
      'value.productTypes.length': value?.productTypes?.length
    });

    // Sync with incoming value prop
    if (value) {
      setLocalValue(value);
      // If value has product types, restore state and show form
      if (value.productTypes && value.productTypes.length > 0) {
        console.log('[OutfitIngredientEditor] Value has productTypes, showing form', value.productTypes);
        setSelectedCategory(value.productTypes[0]);
        setSelectedSubcategories(value.materials || []); // Restore PT2 selection
        setPt2Confirmed(true); // PT2 was confirmed if we have productTypes
        // Show form whenever we have product types selected
        setShowForm(true);
        setIsLocked(false);
        setLockedIngredient(null);
        setSearchText("");
        setIsTitleCustom(false);
      } else {
        console.log('[OutfitIngredientEditor] Value empty (productTypes missing or empty), resetting to PT1', value);
        // Reset to initial state for empty slot
        setSelectedCategory(null);
        setSelectedSubcategories([]);
        setPt2Confirmed(false);
        setShowForm(false);
        setIsLocked(false);
        setLockedIngredient(null);
        setSearchText("");
        setIsTitleCustom(false);
      }
    } else {
      console.log('[OutfitIngredientEditor] No value, resetting to PT1');
      // No value, reset to initial state
      setLocalValue({
        productTypes: [],
        ingredientTitle: "",
        searchQuery: "",
        brands: [],
        materials: [],
      });
      setSelectedCategory(null);
      setSelectedSubcategories([]);
      setPt2Confirmed(false);
      setShowForm(false);
      setIsLocked(false);
      setLockedIngredient(null);
      setSearchText("");
      setIsTitleCustom(false);
    }
  }, [slotIndex, value]);

  // Reset category selection if department changes and current category is not available
  useEffect(() => {
    if (selectedCategory && showForm) {
      const category = productTypeCategories.find(
        (c) => c.id === selectedCategory,
      );
      if (category && !category.departments.includes(department)) {
        // Current category not available in new department, reset to category selection
        setSelectedCategory(null);
        setSelectedSubcategories([]);
        setPt2Confirmed(false);
        setSearchText("");
        setShowForm(false);
        setIsLocked(false);
        setLockedIngredient(null);
        setIsTitleCustom(false);
        const resetValue = {
          productTypes: [],
          ingredientTitle: "",
          searchQuery: "",
          brands: [],
          materials: [],
        };
        setLocalValue(resetValue);
        onChange(resetValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  // Fetch products based on search query with debouncing
  useEffect(() => {
    if (!localValue.searchQuery || localValue.searchQuery.length < 3) {
      setProductResults([]);
      return;
    }

    setIsLoadingProducts(true);
    const timeoutId = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: localValue.searchQuery,
          department: department,
          limit: "50", // Increased for recipe cooking - more options = better outfits
        });

        // Add productType1 if available (REQUIRED for semantic search)
        if (localValue.productTypes.length > 0) {
          params.append("productType1", localValue.productTypes[0]);
          console.log('[CLIP Search] Sending productType1:', localValue.productTypes[0]);
        } else {
          console.warn('[CLIP Search] No productType1 - semantic search will fail!');
        }

        // Add brands filter if any
        if (localValue.brands.length > 0) {
          params.append("brands", localValue.brands.join(","));
        }

        // Add materials filter if any
        if (localValue.materials.length > 0) {
          params.append("materials", localValue.materials.join(","));
        }

        // Choose API endpoint based on search mode
        const apiEndpoint = useSemanticSearch
          ? '/api/search-products-semantic'
          : '/api/search-products';

        const response = await fetch(`${apiEndpoint}?${params.toString()}`);
        const data = await response.json();

        console.log('[CLIP Search] API Response:', {
          status: response.status,
          resultsCount: data.results?.length,
          searchType: data.searchType,
          error: data.error,
          firstResult: data.results?.[0]?.title,
          fullFirstResult: data.results?.[0]
        });

        // Check for API errors
        if (data.error) {
          console.error("API Error:", data.error, data.message);
          console.error("Request params:", {
            query: localValue.searchQuery,
            productType1: localValue.productTypes[0],
            department: department
          });
          setProductResults([]);
          return;
        }

        if (data.results) {
          // Filter CLIP results by minimum similarity threshold
          let filteredResults = data.results;
          if (useSemanticSearch && data.searchType === 'semantic-clip') {
            // FashionSigLIP image-to-text similarity scores are naturally lower (0.04-0.15)
            // than text-to-text scores. Don't filter - trust the model's ranking.
            // The top results are already sorted by similarity from the API.
            filteredResults = data.results;
          }
          setProductResults(filteredResults);
        } else {
          setProductResults([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProductResults([]);
      } finally {
        setIsLoadingProducts(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [localValue.searchQuery, localValue.brands, localValue.materials, localValue.productTypes, department, useSemanticSearch]);

  // Auto-generate title from search query
  const autoGenerateTitle = (query: string): string => {
    if (!query) return "";

    // Convert to title case
    const titleCase = query
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // If under 32 chars, return as-is
    if (titleCase.length <= 32) return titleCase;

    // If too long, intelligently shorten by removing filler words
    const fillerWords = ['the', 'a', 'an', 'and', 'or', 'but', 'with', 'in', 'on', 'at', 'to', 'for', 'of', 'from'];
    const words = query.toLowerCase().split(' ');
    const importantWords = words.filter(word => !fillerWords.includes(word));

    // Take first 3-4 important words
    const shortened = importantWords
      .slice(0, 4)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // If still too long, truncate at word boundary
    if (shortened.length > 32) {
      const truncated = shortened.substring(0, 32);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
    }

    return shortened;
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategories([]); // Reset PT2 when selecting new PT1
    setPt2Confirmed(false); // Reset PT2 confirmation
    setSearchText("");
    // Don't update localValue yet - wait for PT2 selection
  };

  const handleProductTypeChange = () => {
    // Reset to category selection
    setSelectedCategory(null);
    setSelectedSubcategories([]);
    setPt2Confirmed(false);
    setSearchText("");
    setShowForm(false);
    setIsLocked(false);
    setLockedIngredient(null);
    setIsTitleCustom(false);
    const newValue = {
      productTypes: [],
      ingredientTitle: "",
      searchQuery: "",
      brands: [],
      materials: [],
    };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategory)
        ? prev.filter(s => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const handleContinueFromPT2 = () => {
    console.log('[OutfitIngredientEditor] handleContinueFromPT2 called', {
      selectedCategory,
      selectedSubcategories,
      slotIndex,
      'BEFORE localValue': {...localValue}
    });

    // Update local value with PT1 + PT2 selection
    const newValue = {
      ...localValue,
      productTypes: [selectedCategory!],
      materials: selectedSubcategories, // Store PT2 in materials field
    };

    console.log('[OutfitIngredientEditor] AFTER newValue:', newValue);
    console.log('[OutfitIngredientEditor] newValue.productTypes:', newValue.productTypes);
    setLocalValue(newValue);

    console.log('[OutfitIngredientEditor] Calling onChange with:', newValue);
    onChange(newValue); // Notify parent to persist the selection

    // Mark PT2 as confirmed to advance to Step 3 (search interface)
    console.log('[OutfitIngredientEditor] Setting pt2Confirmed = true');
    setPt2Confirmed(true);
  };

  const handleBackToPT2 = () => {
    // Go back one step to PT2 selection (keep PT1)
    setSelectedSubcategories([]);
    setPt2Confirmed(false); // Reset PT2 confirmation to show PT2 screen again
  };

  const handleBackToPT1 = () => {
    // Go all the way back to PT1 selection
    setSelectedCategory(null);
    setSelectedSubcategories([]);
    setPt2Confirmed(false);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  const handleRemoveFilter = (
    filterType: "brands" | "materials",
    valueToRemove: string,
  ) => {
    const currentValues = localValue[filterType];
    const newValues = currentValues.filter((v: string) => v !== valueToRemove);
    handleFieldChange(filterType, newValues);
  };

  const handleSelectExisting = (ingredient: ExistingIngredient) => {
    setLockedIngredient(ingredient);
    setIsLocked(true);
    setSearchText("");
    setShowForm(false);

    // Check if this category is exclusive to one department - lock if so
    const category = productTypeCategories.find(
      (c) => c.id === selectedCategory,
    );
    if (category && category.departments.length === 1 && onDepartmentLock) {
      onDepartmentLock();
    }

    // Update parent with locked ingredient data
    const newValue = {
      productTypes: [ingredient.productType1],
      ingredientTitle: ingredient.displayTitle,
      searchQuery: ingredient.query,
      brands: ingredient.brands,
      materials: ingredient.materials,
    };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleUnlock = () => {
    // Keep the data but unlock for editing (creates variant)
    setIsLocked(false);
    setShowForm(true);
    setIsTitleCustom(false); // Reset to auto-generated title mode
    // Data stays in form, user can now modify to create variant
  };

  const handleContinueWithNew = () => {
    // Check if this category is exclusive to one department - lock if so
    const category = productTypeCategories.find(
      (c) => c.id === selectedCategory,
    );
    if (category && category.departments.length === 1 && onDepartmentLock) {
      onDepartmentLock();
    }

    // Move search text to query field and auto-generate title
    // IMPORTANT: Include productTypes and materials from state
    const newValue = {
      ...localValue,
      productTypes: [selectedCategory!],  // Get from state, not localValue
      materials: selectedSubcategories,    // Get PT2 from state
      searchQuery: searchText,
      ingredientTitle: autoGenerateTitle(searchText),
    };
    setLocalValue(newValue);
    onChange(newValue);
    setShowForm(true);
  };

  // Filter and fuzzy match existing ingredients by selected category and search text
  const filteredIngredients = selectedCategory
    ? existingIngredients.filter((i) => {
        if (i.productType1 !== selectedCategory) return false;
        if (!searchText) return true;

        const searchLower = searchText.toLowerCase();
        const titleMatch = i.displayTitle.toLowerCase().includes(searchLower);
        const queryMatch = i.query.toLowerCase().includes(searchLower);

        return titleMatch || queryMatch;
      })
    : [];

  const hasExactMatch = filteredIngredients.some(
    (i) => i.displayTitle.toLowerCase() === searchText.toLowerCase(),
  );
  const hasCloseMatch = filteredIngredients.length > 0 && searchText.length > 3;
  const canCreateNew = searchText.length > 0 && !hasExactMatch;

  const handleFieldChange = (field: string, value: any) => {
    const newValue = { ...localValue, [field]: value };

    // Auto-update title when search query changes (unless title is custom)
    if (field === "searchQuery" && !isTitleCustom) {
      newValue.ingredientTitle = autoGenerateTitle(value);
    }

    setLocalValue(newValue);
    onChange(newValue); // Notify parent to save changes
  };

  const handleToggleTitleCustom = () => {
    const newCustomState = !isTitleCustom;
    setIsTitleCustom(newCustomState);

    // If switching back to auto-generated, regenerate title from current query
    if (!newCustomState) {
      const newValue = {
        ...localValue,
        ingredientTitle: autoGenerateTitle(localValue.searchQuery),
      };
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  // Step 1: Product Category Selection
  console.log('[OutfitIngredientEditor] Render state:', {
    selectedCategory,
    selectedSubcategories,
    showForm,
    isLocked,
    localValue
  });

  if (!selectedCategory) {
    console.log('[OutfitIngredientEditor] Rendering PT1 (Category Selection)');
    // Check if any ingredient has been completely filled
    const hasAnyFilledSlot = allIngredients.some(
      (ing) => ing && ing.ingredientTitle && ing.productTypes.length > 0
    );

    // Get all categories already used in other slots (excluding current slot)
    const usedCategories = allIngredients
      .filter((ing, idx) => idx !== slotIndex && ing && ing.productTypes.length > 0)
      .flatMap((ing) => ing!.productTypes);

    // Filter categories by department and priority
    // Until at least one slot is filled, only show primary outfit-defining categories
    // After any slot is filled, show all categories (including accessories)
    const availableCategories = productTypeCategories.filter((cat) => {
      const departmentMatch = cat.departments.includes(department);
      const priorityMatch = hasAnyFilledSlot ? true : cat.priority === "primary";

      // Check if this category is already used
      const isAlreadyUsed = usedCategories.includes(cat.id);

      // If already used, check if multiples are allowed
      if (isAlreadyUsed) {
        // Allow if this category permits multiples
        if (allowsMultiples(cat.id)) {
          return departmentMatch && priorityMatch;
        }

        // Check for coexistence rule (Dresses + Bottoms)
        const hasCoexistingCategory = usedCategories.some(used => canCoexist(cat.id, used));
        if (hasCoexistingCategory) {
          return departmentMatch && priorityMatch;
        }

        // Otherwise, exclude this category
        return false;
      }

      return departmentMatch && priorityMatch;
    });

    return (
      <Box>
        <Typography variant="h3" gutterBottom>
          {hasAnyFilledSlot
            ? "Add the next ingredient"
            : "What's the first item in this outfit?"}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {hasAnyFilledSlot
            ? "Select the product type for this ingredient. You can then search existing ingredients or create a new one."
            : "Start with an outfit-defining piece like a dress, top, or jacket."}
        </Typography>

        <Grid container spacing={2}>
          {availableCategories.map((type) => (
            <Grid item xs={12} sm={6} md={4} key={type.id}>
              <Card
                variant="outlined"
                onClick={() => handleCategorySelect(type.id)}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.50",
                  },
                }}
              >
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      {type.icon}
                      <Typography variant="body1" fontWeight={500}>
                        {type.label}
                      </Typography>
                    </Stack>
                    <IconButton size="small" color="primary">
                      <AddIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Step 2: Subcategory Selection (PT2)
  // Show PT2 screen until Continue is clicked (pt2Confirmed = true)
  if (selectedCategory && !pt2Confirmed) {
    console.log('[OutfitIngredientEditor] Rendering PT2 (Subcategory Selection)');
    const category = productTypeCategories.find((c) => c.id === selectedCategory);
    const pt2Options = getPT2Options(selectedCategory);

    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToPT1}
          sx={{ mb: 3 }}
          variant="outlined"
        >
          Back to Categories
        </Button>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          {category?.icon}
          <Typography variant="h3">{category?.label}</Typography>
        </Stack>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select one or more subcategories to include in this ingredient set
        </Typography>

        <Grid container spacing={1} sx={{ mb: 4 }}>
          {pt2Options.map((subcat) => (
            <Grid item key={subcat}>
              <Chip
                label={subcat}
                clickable
                color={selectedSubcategories.includes(subcat) ? "primary" : "default"}
                variant={selectedSubcategories.includes(subcat) ? "filled" : "outlined"}
                onClick={() => handleSubcategoryToggle(subcat)}
                sx={{
                  fontSize: "0.95rem",
                  height: "36px",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: selectedSubcategories.includes(subcat)
                      ? "primary.dark"
                      : "action.hover",
                  },
                }}
              />
            </Grid>
          ))}
        </Grid>

        <Box>
          <Button
            variant="contained"
            size="large"
            disabled={selectedSubcategories.length === 0}
            onClick={handleContinueFromPT2}
            endIcon={<ArrowBackIcon sx={{ transform: "rotate(180deg)" }} />}
          >
            Continue
          </Button>

          {selectedSubcategories.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              Select at least one subcategory to continue
            </Typography>
          )}
          {selectedSubcategories.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              {selectedSubcategories.length} subcategor{selectedSubcategories.length === 1 ? "y" : "ies"} selected
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Step 3: Search/describe ingredient with live suggestions
  // Show search interface after PT2 is confirmed but before form is shown
  if (selectedCategory && pt2Confirmed && !isLocked && !showForm) {
    const categoryLabel =
      productTypeCategories.find((c) => c.id === selectedCategory)?.label || "";

    return (
      <Box>
        {/* Collapsible Product Type Selection Panel */}
        <Accordion sx={{ mb: 3, bgcolor: "grey.50" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
              <CheckroomIcon color="primary" sx={{ fontSize: 24 }} />
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  {categoryLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedSubcategories.join(", ")}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Want to change your subcategory selection?
              </Typography>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToPT2}
                variant="outlined"
                size="small"
                sx={{ alignSelf: "flex-start" }}
              >
                Back to Subcategories
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Typography variant="h4" gutterBottom>
          Start describing the {toSingularForm(categoryLabel).toLowerCase()}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Type to search existing ingredients or describe a new one. Similar
          ingredients will appear below.
        </Typography>

        <TextField
          fullWidth
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={`e.g., high waist flare jeans, oversized cardigan, silk blouse...`}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {/* Existing ingredient suggestions */}
        {searchText && filteredIngredients.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography
              variant="body2"
              fontWeight={500}
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {hasCloseMatch
                ? "Did you mean one of these?"
                : "Existing ingredients"}
            </Typography>
            <Stack spacing={2}>
              {filteredIngredients.slice(0, 5).map((ingredient) => (
                <Card
                  key={ingredient.id}
                  variant="outlined"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "primary.50",
                    },
                  }}
                  onClick={() => handleSelectExisting(ingredient)}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body1"
                          fontWeight={500}
                          gutterBottom
                        >
                          {ingredient.displayTitle}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          {ingredient.query}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          {ingredient.brands.slice(0, 3).map((brand) => (
                            <Chip
                              key={brand}
                              label={brand}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {ingredient.brands.length > 3 && (
                            <Chip
                              label={`+${ingredient.brands.length - 3}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Box>
                      <Button size="small" variant="outlined">
                        Use This
                      </Button>
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 2, display: "block" }}
                    >
                      Used in {ingredient.usedInRecipes} recipe
                      {ingredient.usedInRecipes !== 1 ? "s" : ""}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {/* Create new option */}
        {canCreateNew && (
          <Box sx={{ mt: 3 }}>
            {filteredIngredients.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or create a new one
              </Typography>
            )}
            <Card
              variant="outlined"
              sx={{
                borderStyle: "dashed",
                bgcolor: "grey.50",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "primary.50",
                },
              }}
              onClick={handleContinueWithNew}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <AddIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                      Create new: "{searchText}"
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This will be a new ingredient set
                    </Typography>
                  </Box>
                  <Button variant="contained" size="small">
                    Continue
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Empty state */}
        {!searchText && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Start typing to search existing ingredients or create a new one
            </Typography>
          </Box>
        )}

        {/* No results state */}
        {searchText && filteredIngredients.length === 0 && !canCreateNew && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Type more to create a new ingredient
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Step 3: Locked state - Show ingredient details with unlock option (edit-like layout)
  if (isLocked && lockedIngredient) {
    const allSelectedFilters = [
      ...lockedIngredient.brands,
      ...lockedIngredient.materials,
    ];

    return (
      <Box>
        <Stack spacing={3}>
          {/* Category header with change option */}
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckroomIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h3">
              {
                productTypeCategories.find((c) => c.id === selectedCategory)
                  ?.label
              }
            </Typography>
            <Button
              startIcon={<ChangeCircleIcon />}
              onClick={handleProductTypeChange}
              size="small"
            >
              Change
            </Button>
          </Stack>

          {/* Locked status banner */}
          <Card
            variant="outlined"
            sx={{ bgcolor: "success.50", borderColor: "success.main" }}
          >
            <CardContent sx={{ py: 1.5 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LockIcon fontSize="small" color="success" />
                  <Typography
                    variant="body2"
                    color="success.dark"
                    fontWeight={500}
                  >
                    Locked (Reusing) • Used in {lockedIngredient.usedInRecipes}{" "}
                    recipe{lockedIngredient.usedInRecipes !== 1 ? "s" : ""}
                  </Typography>
                </Stack>
                <Button
                  variant="outlined"
                  startIcon={<LockOpenIcon />}
                  onClick={handleUnlock}
                  size="small"
                  color="success"
                >
                  Unlock to Edit
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Ingredient Title (read-only style) */}
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                left: -60,
                top: 12,
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: 700,
              }}
            >
              {slotIndex + 1}
            </Box>
            <TextField
              label="Ingredient Title"
              value={lockedIngredient.displayTitle}
              fullWidth
              disabled
              InputProps={{
                readOnly: true,
              }}
            />
          </Box>

          {/* Search Query (read-only) */}
          <TextField
            value={lockedIngredient.query}
            fullWidth
            disabled
            InputProps={{
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* Selected Filter Chips */}
          {allSelectedFilters.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {lockedIngredient.materials.map((type) => (
                <Chip key={type} label={type} sx={{ bgcolor: "grey.200" }} />
              ))}
              {lockedIngredient.brands.map((brand) => (
                <Chip key={brand} label={brand} sx={{ bgcolor: "grey.200" }} />
              ))}
            </Stack>
          )}

          {/* Example Products Preview */}
          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: 3,
              bgcolor: "grey.50",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <VisibilityOutlinedIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={700}>
                  Example Only
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                217 Results
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 3 }}
            >
              Published items will vary with product availability.
            </Typography>

            <Grid container spacing={2}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid item xs={4} key={i}>
                  <Box
                    sx={{
                      aspectRatio: "3/4",
                      bgcolor: "grey.200",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Product {i}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </Box>
    );
  }

  // Step 4: Ingredient Configuration Form (for new or variant)
  if (showForm && !isLocked) {
    console.log('[OutfitIngredientEditor] Rendering Step 4 (Ingredient Form)');
    const allSelectedFilters = [...localValue.brands, ...localValue.materials];
    const isVariant = lockedIngredient && !isLocked;

    return (
      <Box>
        <Stack spacing={3}>
          {/* Category header with slot badge and change option */}
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                left: -60,
                top: 0,
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: 700,
              }}
            >
              {slotIndex + 1}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckroomIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h3">
                {
                  productTypeCategories.find((c) => c.id === selectedCategory)
                    ?.label
                }
              </Typography>
              <Button
                startIcon={<ChangeCircleIcon />}
                onClick={handleProductTypeChange}
                size="small"
              >
                Change
              </Button>
            </Stack>
          </Box>

          {/* Variant indicator */}
          {isVariant && (
            <Card
              variant="outlined"
              sx={{ bgcolor: "info.50", borderColor: "info.main" }}
            >
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EditIcon fontSize="small" color="info" />
                  <Typography variant="body2" color="info.dark">
                    Creating variant of "{lockedIngredient.displayTitle}"
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Ingredient Form Card */}
          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Ingredient Title */}
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={500}
                    >
                      Ingredient Title
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {String(localValue.ingredientTitle.length).padStart(2, "0")}
                      /32
                    </Typography>
                  </Stack>
                  {isTitleCustom ? (
                    <TextField
                      value={localValue.ingredientTitle}
                      onChange={(e) =>
                        handleFieldChange("ingredientTitle", e.target.value)
                      }
                      fullWidth
                      size="small"
                      inputProps={{ maxLength: 32 }}
                      placeholder="e.g., Structured shirt jacket"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={handleToggleTitleCustom}
                              edge="end"
                              title="Use auto-generated title"
                            >
                              <LockOpenIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          flex: 1,
                          color: "text.primary",
                        }}
                      >
                        {localValue.ingredientTitle ||
                          "Auto-generated from search query"}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={handleToggleTitleCustom}
                        title="Customize title"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Box>

                {/* Semantic Search Toggle */}
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useSemanticSearch}
                        onChange={(e) => setUseSemanticSearch(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PsychologyIcon fontSize="small" color={useSemanticSearch ? "primary" : "disabled"} />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Semantic Search (CLIP)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {useSemanticSearch
                              ? "AI understands style & aesthetics (e.g., 'cozy', 'edgy', 'athletic')"
                              : "Keyword matching only"
                            }
                          </Typography>
                        </Box>
                      </Stack>
                    }
                  />
                </Box>

                {/* Search Query */}
                <TextField
                  value={localValue.searchQuery}
                  onChange={(e) =>
                    handleFieldChange("searchQuery", e.target.value)
                  }
                  fullWidth
                  inputProps={{ maxLength: 72 }}
                  helperText={`${String(localValue.searchQuery.length).padStart(2, "0")}/72`}
                  placeholder={useSemanticSearch
                    ? "e.g., cozy chunky knit, dark edgy formal, athletic performance..."
                    : "e.g., high waist flare leg blue denim jeans"
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Filters Row */}
                <Grid container spacing={2}>
                  {/* Product Subcategory Filter */}
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Product Subcategory</InputLabel>
                      <Select
                        multiple
                        value={localValue.materials}
                        onChange={(e) =>
                          handleFieldChange("materials", e.target.value)
                        }
                        input={<OutlinedInput label="Product Subcategory" />}
                        renderValue={(selected) => (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <AddCircleOutlineIcon fontSize="small" />
                            <Typography variant="body2">
                              {selected.length} Selected
                            </Typography>
                          </Box>
                        )}
                      >
                        {availableMaterials.map((type) => (
                          <MenuItem key={type} value={type}>
                            <Checkbox
                              checked={localValue.materials.indexOf(type) > -1}
                            />
                            <ListItemText primary={type} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Brands Filter */}
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Brands</InputLabel>
                      <Select
                        multiple
                        value={localValue.brands}
                        onChange={(e) =>
                          handleFieldChange("brands", e.target.value)
                        }
                        input={<OutlinedInput label="Brands" />}
                        renderValue={(selected) => (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <AddCircleOutlineIcon fontSize="small" />
                            <Typography variant="body2">
                              {selected.length} Selected
                            </Typography>
                          </Box>
                        )}
                      >
                        {availableBrands.map((brand) => (
                          <MenuItem key={brand} value={brand}>
                            <Checkbox
                              checked={localValue.brands.indexOf(brand) > -1}
                            />
                            <ListItemText primary={brand} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Selected Filter Chips */}
                {allSelectedFilters.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {localValue.materials.map((type) => (
                      <Chip
                        key={type}
                        label={type}
                        onDelete={() => handleRemoveFilter("materials", type)}
                        sx={{ bgcolor: "grey.200" }}
                      />
                    ))}
                    {localValue.brands.map((brand) => (
                      <Chip
                        key={brand}
                        label={brand}
                        onDelete={() => handleRemoveFilter("brands", brand)}
                        sx={{ bgcolor: "grey.200" }}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Product Search Results Preview */}
          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: 3,
              bgcolor: "grey.50",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <VisibilityOutlinedIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={700}>
                  Live Product Preview
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {isLoadingProducts
                  ? "Searching..."
                  : productResults.length > 0
                  ? `${productResults.length} Results`
                  : ""}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 3 }}
            >
              {productResults.length > 0
                ? "Showing top matching products. Published items will vary with product availability."
                : "Enter a search query above to see matching products."}
            </Typography>

            {localValue.searchQuery.length < 3 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                sx={{ py: 4 }}
              >
                Enter at least 3 characters to search for products.
              </Typography>
            ) : isLoadingProducts ? (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                sx={{ py: 4 }}
              >
                Loading products...
              </Typography>
            ) : productResults.length > 0 ? (
              <Grid container spacing={2}>
                {productResults.slice(0, 12).map((product) => (
                  <Grid item xs={4} key={product.productId}>
                    <Box
                      sx={{
                        cursor: "pointer",
                        transition: "transform 0.2s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          aspectRatio: "3/4",
                          bgcolor: "grey.200",
                          borderRadius: 1,
                          overflow: "hidden",
                          mb: 1,
                        }}
                      >
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={
                              product.images[0].localImagePath
                                ? `/api/product-image?path=${encodeURIComponent(product.images[0].localImagePath)}`
                                : product.images[0].url
                            }
                            alt={product.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              No Image
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        display="block"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          mb: 0.5,
                        }}
                      >
                        {product.brand}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.4,
                          mb: 0.5,
                        }}
                      >
                        {product.title}
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {product.price}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                sx={{ py: 4 }}
              >
                No products found for "{localValue.searchQuery}". Try adjusting your search terms or filters.
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}

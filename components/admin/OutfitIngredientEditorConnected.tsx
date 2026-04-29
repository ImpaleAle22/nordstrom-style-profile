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
  CircularProgress,
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
import { useState, useEffect } from "react";
import {
  useAllIngredientSets,
  useAllBrands,
  useProductType2Options,
  useProductsByIngredient,
  type ExistingIngredient,
} from "@/lib/recipe-hooks";

interface ProductTypeCard {
  id: string;
  label: string;
  icon: React.ReactNode;
  departments: ("Womenswear" | "Menswear")[];
  priority: "primary" | "secondary";
}

interface OutfitIngredientEditorProps {
  slotIndex: number;
  department: "Womenswear" | "Menswear";
  value: {
    productTypes: string[];
    ingredientTitle: string;
    searchQuery: string;
    brands: string[];
    materials: string[]; // Actually productType2
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
  // Primary - Outfit-defining categories
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
    label: "Jackets & Blazers",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },
  {
    id: "Suits/Sets/Wardrobers",
    label: "Suits & Sets",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "primary",
  },

  // Secondary - Accessories & finishing touches
  {
    id: "Shoes",
    label: "Shoes",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Bags",
    label: "Bags",
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
    id: "Eyewear",
    label: "Eyewear",
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
    id: "Scarves/Wraps/Ponchos",
    label: "Scarves & Wraps",
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
    id: "Neckwear",
    label: "Ties & Neckwear",
    icon: <CheckroomIcon />,
    departments: ["Menswear"],
    priority: "secondary",
  },
  {
    id: "Hosiery",
    label: "Socks & Hosiery",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Gloves/Mittens",
    label: "Gloves & Mittens",
    icon: <CheckroomIcon />,
    departments: ["Womenswear", "Menswear"],
    priority: "secondary",
  },
  {
    id: "Swimwear",
    label: "Swimwear",
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

export default function OutfitIngredientEditorConnected({
  slotIndex,
  department,
  value,
  allIngredients,
  onChange,
  onDepartmentLock,
}: OutfitIngredientEditorProps) {
  // ─── SANITY DATA HOOKS ────────────────────────────────────────────────────
  const { ingredientSets: allExistingIngredients, isLoading: ingredientsLoading } =
    useAllIngredientSets();
  const { brands: availableBrands, isLoading: brandsLoading } = useAllBrands();

  // ─── LOCAL STATE ──────────────────────────────────────────────────────────
  const [localValue, setLocalValue] = useState(
    value || {
      productTypes: [],
      ingredientTitle: "",
      searchQuery: "",
      brands: [],
      materials: [], // productType2
    }
  );

  const [isLocked, setIsLocked] = useState(false);
  const [lockedIngredient, setLockedIngredient] =
    useState<ExistingIngredient | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isTitleCustom, setIsTitleCustom] = useState(false);

  // Fetch productType2 options for selected category
  const { productType2Options, isLoading: type2Loading } = useProductType2Options(
    selectedCategory
  );

  // Fetch preview products
  const {
    products: previewProducts,
    productCount,
    isLoading: productsLoading,
  } = useProductsByIngredient({
    productType1: selectedCategory,
    department,
    brands: localValue.brands,
    productType2: localValue.materials, // materials field holds productType2
  });

  const hasProductType = localValue.productTypes.length > 0;

  // ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────

  const allowsMultiples = (categoryId: string): boolean => {
    const multiplesAllowed = [
      "Tops",
      "Necklaces",
      "Bracelets",
      "Rings",
      "Scarves",
    ];
    return multiplesAllowed.includes(categoryId);
  };

  const canCoexist = (cat1: string, cat2: string): boolean => {
    return (
      (cat1 === "Dresses" && cat2 === "Bottoms") ||
      (cat1 === "Bottoms" && cat2 === "Dresses")
    );
  };

  const toSingularForm = (label: string): string => {
    let result = label.replace(/ & /g, " or ").replace(/ and /g, " or ");

    const specialCases: Record<string, string> = {
      Scarves: "scarf",
      Ties: "tie",
      Accessories: "accessory",
      "Hair Accessories": "hair accessory",
    };

    if (specialCases[result]) {
      return specialCases[result];
    }

    if (result.includes(" or ")) {
      const parts = result.split(" or ");
      const singularParts = parts.map((part) => {
        part = part.trim();
        if (specialCases[part]) return specialCases[part];
        if (part.endsWith("ies")) return part.slice(0, -3) + "y";
        if (
          part.endsWith("ches") ||
          part.endsWith("shes") ||
          part.endsWith("sses") ||
          part.endsWith("xes") ||
          part.endsWith("zes")
        ) {
          return part.slice(0, -2);
        }
        if (part.endsWith("es")) return part.slice(0, -1);
        if (part.endsWith("s")) return part.slice(0, -1);
        return part;
      });
      return singularParts.join(" or ");
    }

    if (result.endsWith("ies")) return result.slice(0, -3) + "y";
    if (
      result.endsWith("ches") ||
      result.endsWith("shes") ||
      result.endsWith("sses") ||
      result.endsWith("xes") ||
      result.endsWith("zes")
    ) {
      return result.slice(0, -2);
    }
    if (result.endsWith("es")) return result.slice(0, -1);
    if (result.endsWith("s")) return result.slice(0, -1);
    return result;
  };

  const autoGenerateTitle = (query: string): string => {
    if (!query) return "";

    const titleCase = query
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    if (titleCase.length <= 32) return titleCase;

    const fillerWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "with",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "from",
    ];
    const words = query.toLowerCase().split(" ");
    const importantWords = words.filter((word) => !fillerWords.includes(word));

    const shortened = importantWords
      .slice(0, 4)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    if (shortened.length > 32) {
      const truncated = shortened.substring(0, 32);
      const lastSpace = truncated.lastIndexOf(" ");
      return lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
    }

    return shortened;
  };

  // ─── EVENT HANDLERS ───────────────────────────────────────────────────────

  useEffect(() => {
    if (value) {
      setLocalValue(value);
      if (value.productTypes && value.productTypes.length > 0) {
        setSelectedCategory(value.productTypes[0]);
        if (value.ingredientTitle && value.searchQuery) {
          setShowForm(true);
        }
      }
    } else {
      setLocalValue({
        productTypes: [],
        ingredientTitle: "",
        searchQuery: "",
        brands: [],
        materials: [],
      });
      setSelectedCategory(null);
      setShowForm(false);
      setIsLocked(false);
      setLockedIngredient(null);
      setSearchText("");
      setIsTitleCustom(false);
    }
  }, [slotIndex, value]);

  useEffect(() => {
    if (selectedCategory) {
      const category = productTypeCategories.find(
        (c) => c.id === selectedCategory
      );
      if (category && !category.departments.includes(department)) {
        setSelectedCategory(null);
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
  }, [department, selectedCategory]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchText("");

    const newValue = {
      ...localValue,
      productTypes: [categoryId],
    };
    setLocalValue(newValue);
  };

  const handleProductTypeChange = () => {
    setSelectedCategory(null);
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

  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  const handleFieldChange = (field: string, value: any) => {
    const newValue = { ...localValue, [field]: value };

    if (field === "searchQuery" && !isTitleCustom) {
      newValue.ingredientTitle = autoGenerateTitle(value);
    }

    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleToggleTitleCustom = () => {
    if (!isTitleCustom) {
      setIsTitleCustom(true);
    } else {
      setIsTitleCustom(false);
      const newValue = {
        ...localValue,
        ingredientTitle: autoGenerateTitle(localValue.searchQuery),
      };
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const handleRemoveFilter = (
    filterType: "brands" | "materials",
    valueToRemove: string
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

    const category = productTypeCategories.find(
      (c) => c.id === selectedCategory
    );
    if (category && category.departments.length === 1 && onDepartmentLock) {
      onDepartmentLock();
    }

    const newValue = {
      productTypes: [ingredient.productType1],
      ingredientTitle: ingredient.displayTitle,
      searchQuery: ingredient.query,
      brands: ingredient.brands,
      materials: ingredient.productType2 ? [ingredient.productType2] : [],
    };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleContinueWithNew = () => {
    setShowForm(true);
    const newValue = {
      ...localValue,
      searchQuery: searchText,
      ingredientTitle: autoGenerateTitle(searchText),
    };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setShowForm(true);
    setLockedIngredient(null);
  };

  // ─── SEARCH LOGIC ─────────────────────────────────────────────────────────

  const searchTokens = searchText.toLowerCase().split(" ").filter(Boolean);

  const filteredIngredients = allExistingIngredients
    .filter((ing) => ing.productType1 === selectedCategory)
    .filter((ing) => {
      if (searchTokens.length === 0) return false;
      const searchableText = [
        ing.displayTitle,
        ing.query,
        ...ing.brands,
        ...ing.tags,
      ]
        .join(" ")
        .toLowerCase();
      return searchTokens.every((token) => searchableText.includes(token));
    })
    .sort((a, b) => b.usedInRecipes - a.usedInRecipes);

  const hasCloseMatch = filteredIngredients.some((ing) => {
    const displayLower = ing.displayTitle.toLowerCase();
    return searchTokens.every((token) => displayLower.includes(token));
  });

  const canCreateNew = searchText.length >= 5;

  // ─── RENDER STEPS ─────────────────────────────────────────────────────────

  // Step 1: Category selection
  if (!selectedCategory) {
    const availableCategories = productTypeCategories.filter((cat) =>
      cat.departments.includes(department)
    );
    const primaryCategories = availableCategories.filter(
      (cat) => cat.priority === "primary"
    );
    const secondaryCategories = availableCategories.filter(
      (cat) => cat.priority === "secondary"
    );

    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Choose a product type
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Select the primary category for this ingredient slot
        </Typography>

        {/* Primary Categories */}
        <Typography
          variant="body2"
          fontWeight={700}
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Outfit-Defining
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {primaryCategories.map((category) => (
            <Grid item xs={6} sm={4} md={3} key={category.id}>
              <Card
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.50",
                  },
                }}
                onClick={() => handleCategorySelect(category.id)}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    py: 3,
                  }}
                >
                  {category.icon}
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ mt: 1, textAlign: "center" }}
                  >
                    {category.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Secondary Categories */}
        <Typography
          variant="body2"
          fontWeight={700}
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Accessories & Finishing Touches
        </Typography>
        <Grid container spacing={2}>
          {secondaryCategories.map((category) => (
            <Grid item xs={6} sm={4} md={3} key={category.id}>
              <Card
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.50",
                  },
                }}
                onClick={() => handleCategorySelect(category.id)}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    py: 3,
                  }}
                >
                  {category.icon}
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ mt: 1, textAlign: "center" }}
                  >
                    {category.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Step 2: Search existing or create new
  const categoryLabel =
    productTypeCategories.find((c) => c.id === selectedCategory)?.label || "";

  if (selectedCategory && !showForm && !isLocked) {
    return (
      <Box>
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<ChangeCircleIcon />}
            onClick={handleProductTypeChange}
          >
            Change Type
          </Button>
        </Stack>

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

        {ingredientsLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Existing ingredient suggestions */}
        {!ingredientsLoading && searchText && filteredIngredients.length > 0 && (
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
                  key={ingredient._id}
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
                        <Typography variant="body1" fontWeight={500} gutterBottom>
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

  // Step 3: Locked state (reusing existing ingredient)
  if (isLocked && lockedIngredient) {
    const allSelectedFilters = [
      ...lockedIngredient.brands,
      ...(lockedIngredient.productType2 ? [lockedIngredient.productType2] : []),
    ];

    return (
      <Box>
        <Stack spacing={3}>
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

          {allSelectedFilters.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {lockedIngredient.productType2 && (
                <Chip
                  label={lockedIngredient.productType2}
                  sx={{ bgcolor: "grey.200" }}
                />
              )}
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
                {productsLoading ? "Loading..." : `${productCount} Results`}
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

            {productsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {previewProducts.slice(0, 6).map((product, i) => (
                  <Grid item xs={4} key={product._id || i}>
                    <Box
                      sx={{
                        aspectRatio: "3/4",
                        bgcolor: "grey.200",
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {product.primaryImageUrl ? (
                        <img
                          src={product.primaryImageUrl}
                          alt={product.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {product.title?.substring(0, 20)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Stack>
      </Box>
    );
  }

  // Step 4: Form (create new or edit variant)
  if (showForm && !isLocked) {
    const allSelectedFilters = [...localValue.brands, ...localValue.materials];
    const isVariant = lockedIngredient && !isLocked;

    return (
      <Box>
        <Stack spacing={3}>
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

                {/* Search Query */}
                <TextField
                  value={localValue.searchQuery}
                  onChange={(e) =>
                    handleFieldChange("searchQuery", e.target.value)
                  }
                  fullWidth
                  inputProps={{ maxLength: 72 }}
                  helperText={`${String(localValue.searchQuery.length).padStart(
                    2,
                    "0"
                  )}/72`}
                  placeholder="e.g., high waist flare leg blue denim jeans"
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
                  {/* Product Type 2 Filter */}
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Subcategory</InputLabel>
                      <Select
                        multiple
                        value={localValue.materials}
                        onChange={(e) =>
                          handleFieldChange("materials", e.target.value)
                        }
                        input={<OutlinedInput label="Subcategory" />}
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
                        {type2Loading ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} />
                          </MenuItem>
                        ) : (
                          productType2Options.map((type) => (
                            <MenuItem key={type} value={type}>
                              <Checkbox
                                checked={localValue.materials.indexOf(type) > -1}
                              />
                              <ListItemText primary={type} />
                            </MenuItem>
                          ))
                        )}
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
                        {brandsLoading ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} />
                          </MenuItem>
                        ) : (
                          availableBrands.map((brand) => (
                            <MenuItem key={brand} value={brand}>
                              <Checkbox
                                checked={localValue.brands.indexOf(brand) > -1}
                              />
                              <ListItemText primary={brand} />
                            </MenuItem>
                          ))
                        )}
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
                      />
                    ))}
                    {localValue.brands.map((brand) => (
                      <Chip
                        key={brand}
                        label={brand}
                        onDelete={() => handleRemoveFilter("brands", brand)}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

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
                {productsLoading ? "Loading..." : `${productCount} Results`}
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

            {productsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {previewProducts.slice(0, 6).map((product, i) => (
                  <Grid item xs={4} key={product._id || i}>
                    <Box
                      sx={{
                        aspectRatio: "3/4",
                        bgcolor: "grey.200",
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {product.primaryImageUrl ? (
                        <img
                          src={product.primaryImageUrl}
                          alt={product.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {product.title?.substring(0, 20)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Stack>
      </Box>
    );
  }

  return null;
}

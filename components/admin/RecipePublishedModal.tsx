"use client";

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/navigation";

interface RecipePublishedModalProps {
  open: boolean;
  recipeTitle: string;
  recipeId: string;
}

export default function RecipePublishedModal({
  open,
  recipeTitle,
  recipeId,
}: RecipePublishedModalProps) {
  const router = useRouter();

  const handleViewRecipeManager = () => {
    // TODO: Navigate to recipe manager when it exists
    router.push('/recipes');
  };

  const handleBuildAnother = () => {
    // Reload the page to reset the form
    router.refresh();
    window.location.reload();
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          textAlign: "center",
          p: 4,
        },
      }}
      // Don't allow closing by clicking backdrop
      onClose={() => {}}
    >
      <DialogContent>
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "success.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 48 }} />
          </Box>

          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Recipe Published!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              "{recipeTitle}" has been saved to your Recipe Manager
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ pt: 2, width: "100%" }}>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleViewRecipeManager}
              sx={{ flex: 1 }}
            >
              View Recipe Manager
            </Button>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleBuildAnother}
              sx={{ flex: 1 }}
            >
              Build Another Recipe
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
            Recipe ID: {recipeId}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

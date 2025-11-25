import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, FileText } from "lucide-react";
import { contractService } from "@/services/contractService";
import {
  contractCatalogService,
  type UiContractType,
} from "@/services/contractCatalogService";
import { useToast } from "@/hooks/use-toast";

export default function ContractSelector() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [types, setTypes] = useState<UiContractType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Load contract types from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await contractCatalogService.searchTypes({
          limit: 100,
        });
        setTypes(result);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Error loading contract types",
          description: e?.message || "Failed to fetch contract types",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  // Categories derived from API data
  const categories = useMemo(() => {
    const unique = new Set<string>();
    types.forEach((t) => unique.add(t.category));
    return ["all", ...Array.from(unique)];
  }, [types]);

  // Filter types based on search + selected category
  const filteredTypes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return types.filter((type) => {
      const matchesSearch =
        type.name.toLowerCase().includes(term) ||
        type.category.toLowerCase().includes(term);
      const matchesCategory =
        selectedCategory === "all" || type.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [types, searchTerm, selectedCategory]);

  const handleSelectContract = async (contractType: UiContractType) => {
    try {
      const draft = await contractService.createDraft({
        contractTypeId: contractType.id,
      });

      navigate(`/contracts/${draft.id}`);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to create draft",
        variant: "destructive",
      });
    }
  };

  const getComplexityColor = (level: string) => {
    switch (level) {
      case "simple":
        return "bg-accent/20 text-accent-foreground border-accent/40";
      case "moderate":
        return "bg-primary/20 text-primary-foreground border-primary/40";
      case "complex":
        return "bg-destructive/20 text-destructive-foreground border-destructive/40";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">
                Select Contract Type
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contract types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Loading contract types...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contract Types Grid */}
        {!loading && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTypes.map((contractType) => (
                <Card
                  key={contractType.id}
                  className="cursor-pointer hover:border-primary/40 transition-all hover:shadow-lg"
                  onClick={() => handleSelectContract(contractType)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-base">
                        {contractType.name}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {contractType.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getComplexityColor(
                          contractType.complexity_level,
                        )}`}
                      >
                        {contractType.complexity_level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {contractType.question_count} questions • Approx.{" "}
                      {Math.ceil(contractType.question_count / 3)} min
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!filteredTypes.length && !types.length && (
              <Card className="mt-4">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No contract types available yet. Please check your seed
                    data or backend connection.
                  </p>
                </CardContent>
              </Card>
            )}

            {!filteredTypes.length && types.length > 0 && (
              <Card className="mt-4">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No contract types match your search. Try a different
                    keyword or category.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

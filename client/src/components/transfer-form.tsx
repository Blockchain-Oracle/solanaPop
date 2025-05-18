import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transferToken } from "@/services/transfer-service";
import { Token } from "@shared/schema";

// Transfer form schema
const transferFormSchema = z.object({
  recipientAddress: z.string().min(32, "Invalid Solana address").max(44, "Invalid Solana address"),
  amount: z.coerce.number().min(0.000001, "Amount must be greater than 0"),
});

interface TransferFormProps {
  token: Token;
  onSuccess?: () => void;
}

export function TransferForm({ token, onSuccess }: TransferFormProps) {
  const { toast } = useToast();
  const { connected, walletAddress } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const form = useForm<z.infer<typeof transferFormSchema>>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      recipientAddress: "",
      amount: 1,
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transferFormSchema>) => {
      setIsSubmitting(true);
      try {
        const result = await transferToken(
          token.mintAddress,
          data.recipientAddress,
          data.amount,
          token.isCompressed
        );

        if (!result.success) {
          throw new Error(result.error || "Transfer failed");
        }

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Transfer successful",
        description: "Tokens have been transferred successfully!",
      });

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Transfer failed",
        description: error instanceof Error ? error.message : "Failed to transfer tokens",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof transferFormSchema>) => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to transfer tokens.",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate(data);
  };

  return (
    <Card className="glass border-0">
      <CardHeader>
        <CardTitle>Transfer {token.symbol}</CardTitle>
        <CardDescription>
          Send {token.isCompressed ? "compressed" : ""} tokens to another wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="recipientAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Solana wallet address"
                      className="bg-solana-darker/40 border-white/10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1.0"
                      className="bg-solana-darker/40 border-white/10"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      min={0.000001}
                      step={0.000001}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                className="button-gradient"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">◌</span>
                    Transferring...
                  </>
                ) : (
                  "Transfer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 
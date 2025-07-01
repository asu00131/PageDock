"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";

interface AiCategorizeConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  widgetTitle: string;
}

export function AiCategorizeConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  widgetTitle,
}: AiCategorizeConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认 AI 分类？</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                您确定要使用 AI 自动分类合集 “<strong>{widgetTitle}</strong>” 吗？
              </p>
              <p>
                此操作将会：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>分析此合集中的所有书签。</li>
                <li>移除当前合集。</li>
                <li>创建多个新的、按主题分类的合集来替换它。</li>
              </ul>
              <p>
                此过程可能需要一些时间，且操作无法撤销。
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            是的，进行分类
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

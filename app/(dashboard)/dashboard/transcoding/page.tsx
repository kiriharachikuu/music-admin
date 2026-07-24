"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, RotateCcw, RefreshCw } from "lucide-react";

import { request } from "@/lib/api";
import type { TranscodingJob } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "等待中", variant: "secondary" },
  PROCESSING: { label: "处理中", variant: "default" },
  COMPLETED: { label: "已完成", variant: "outline" },
  FAILED: { label: "失败", variant: "destructive" },
};

export default function TranscodingPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<TranscodingJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TranscodingJob | null>(null);
  const [jobDetail, setJobDetail] = useState<TranscodingJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<TranscodingJob[]>({
        method: "GET",
        url: "/admin/transcoding/jobs",
      });
      setJobs(data ?? []);
    } catch (err) {
      toast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadJobDetail = useCallback(async (jobId: string) => {
    setDetailLoading(true);
    try {
      const data = await request<TranscodingJob>({
        method: "GET",
        url: `/admin/transcoding/jobs/${jobId}`,
      });
      setJobDetail(data ?? null);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  // 自动轮询处理中的任务
  useEffect(() => {
    const hasProcessing = jobs.some((j) => j.status === "PROCESSING");
    if (!hasProcessing && !selectedJob) return;

    const interval = setInterval(() => {
      void loadJobs();
      if (selectedJob) {
        void loadJobDetail(selectedJob.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs, selectedJob, loadJobs, loadJobDetail]);

  const handleStartBatch = async () => {
    setStarting(true);
    try {
      const res = await request<{ jobId: string; message: string }>({
        method: "POST",
        url: "/admin/transcoding/start",
      });
      toast({ title: res?.message ?? "批量转码任务已启动" });
      await loadJobs();
    } catch (err) {
      toast({
        title: "启动失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await request({
        method: "POST",
        url: `/admin/transcoding/jobs/${jobId}/retry`,
      });
      toast({ title: "已重新开始失败项" });
      await loadJobs();
      if (selectedJob?.id === jobId) {
        await loadJobDetail(jobId);
      }
    } catch (err) {
      toast({
        title: "重试失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleSelectJob = (job: TranscodingJob) => {
    setSelectedJob(job);
    void loadJobDetail(job.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="转码任务"
        description="管理歌曲多音质转码任务，查看进度与结果"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleStartBatch}
            disabled={starting}
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            批量转码
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 任务列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">任务列表</CardTitle>
            <CardDescription>查看所有批量转码任务</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && jobs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无转码任务，点击"批量转码"开始
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => {
                  const statusInfo = STATUS_MAP[job.status] ?? { label: job.status, variant: "secondary" as const };
                  const isSelected = selectedJob?.id === job.id;
                  const progress = job.totalSongs > 0
                    ? Math.round(((job.completedSongs + job.failedSongs) / job.totalSongs) * 100)
                    : 0;

                  return (
                    <button
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${
                        isSelected ? "border-primary-500/50 bg-primary-50 dark:bg-primary-950/20" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusInfo.variant} className="text-[10px]">
                            {job.status === "PROCESSING" && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin inline" />
                            )}
                            {statusInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {job.status === "COMPLETED" && job.failedSongs > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRetry(job.id);
                              }}
                              disabled={retryingJobId === job.id}
                              title="重试失败项"
                            >
                              <RotateCcw className={`h-3 w-3 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {job.completedSongs}/{job.totalSongs}
                          {job.failedSongs > 0 && (
                            <span className="text-destructive ml-1">({job.failedSongs} 失败)</span>
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 任务详情 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">任务详情</CardTitle>
                <CardDescription>查看选中任务的歌曲转码明细</CardDescription>
              </div>
              {selectedJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadJobDetail(selectedJob.id)}
                  disabled={detailLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${detailLoading ? "animate-spin" : ""}`} />
                  刷新
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedJob ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                请从左侧任务列表中选择一个任务查看详情
              </div>
            ) : detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !jobDetail?.items || jobDetail.items.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无详细信息
              </div>
            ) : (
              <div className="max-h-[500px] space-y-1 overflow-y-auto">
                {jobDetail.items.map((item) => {
                  const itemStatus = STATUS_MAP[item.status] ?? { label: item.status, variant: "secondary" as const };
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.songTitle}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.songArtist}</p>
                        {item.errorMessage && (
                          <p className="mt-0.5 truncate text-[11px] text-destructive">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                      <Badge variant={itemStatus.variant} className="ml-2 shrink-0 text-[10px]">
                        {item.status === "PROCESSING" && (
                          <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin inline" />
                        )}
                        {itemStatus.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

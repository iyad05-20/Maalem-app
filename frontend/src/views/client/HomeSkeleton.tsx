
import React from 'react';
import { Skeleton } from '../../components/Shared/Skeleton';

export const HomeSkeleton = () => (
    <div className="pt-6 pb-40 px-6">
        {/* Urgent Banner Skeleton */}
        <div className="mb-10">
            <Skeleton className="w-full h-[180px] rounded-[2.5rem]" />
        </div>

        {/* Categories Skeleton */}
        <div className="mb-10">
            <div className="flex justify-between items-end mb-4 px-1">
                <Skeleton className="w-32 h-6" />
                <Skeleton className="w-16 h-4" />
            </div>
            <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-3 min-w-[100px] p-5 glass-card rounded-[2rem]">
                        <Skeleton variant="circle" className="w-12 h-12" />
                        <Skeleton className="w-14 h-3" />
                    </div>
                ))}
            </div>
        </div>

        {/* Top Artisans Skeleton */}
        <div className="mb-10">
            <div className="flex justify-between items-end mb-4 px-1">
                <Skeleton className="w-40 h-6" />
                <Skeleton className="w-16 h-4" />
            </div>
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass-card rounded-[2.5rem] p-6 border border-white/5">
                        <div className="flex gap-4 mb-6">
                            <Skeleton variant="circle" className="w-[72px] h-[72px]" />
                            <div className="pt-1 flex-1 space-y-2">
                                <Skeleton className="w-3/4 h-5" />
                                <Skeleton className="w-1/2 h-3" />
                                <Skeleton className="w-1/4 h-3" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <Skeleton className="flex-1 h-12 rounded-2xl" />
                            <Skeleton className="flex-1 h-12 rounded-2xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

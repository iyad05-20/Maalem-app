
import React from 'react';
import { Skeleton } from '../../components/Shared/Skeleton';

export const SearchSkeleton = () => (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] pb-40">
        <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-white/5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-32 h-6" />
        </header>

        {/* Search Input Skeleton */}
        <div className="px-6 mt-6 mb-4 flex gap-3">
            <Skeleton className="flex-1 h-14 rounded-2xl" />
            <Skeleton className="w-14 h-14 rounded-2xl" />
        </div>

        {/* Sort Tabs Skeleton */}
        <div className="px-6 flex gap-3 mb-6 overflow-hidden">
            {[1, 2, 3].map(i => (
                <Skeleton key={i} className="px-10 py-5 rounded-2xl shrink-0" />
            ))}
        </div>

        {/* Categories Filter Skeleton */}
        <div className="px-6 mb-8">
            <Skeleton className="w-40 h-3 mb-4" />
            <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="px-10 py-4 rounded-2xl shrink-0" />
                ))}
            </div>
        </div>

        {/* Artisan List Skeleton */}
        <div className="px-6 space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-5">
                    <div className="flex items-start gap-4">
                        <Skeleton className="size-20 rounded-[1.8rem]" />
                        <div className="flex-1 py-1 space-y-3">
                            <div className="flex justify-between">
                                <Skeleton className="w-1/2 h-5" />
                                <Skeleton className="w-10 h-6 rounded-lg" />
                            </div>
                            <Skeleton className="w-1/3 h-3" />
                            <div className="flex gap-3">
                                <Skeleton className="w-20 h-3" />
                                <Skeleton className="w-16 h-3" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

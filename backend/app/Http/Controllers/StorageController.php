<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class StorageController extends Controller
{
    /**
     * Stream a file from the public storage disk.
     * Accepts paths like: products/202510/abc.jpg or storage/products/202510/abc.jpg
     */
    public function serve(Request $request, string $path)
    {
        $cleanPath = ltrim($path, '/');
        if (str_starts_with($cleanPath, 'storage/')) {
            $cleanPath = substr($cleanPath, strlen('storage/'));
        }

        // Try multiple locations: public disk, then local disk, with and without 'public/' prefix
        $candidates = [
            ['disk' => 'public', 'path' => $cleanPath],
            ['disk' => 'public', 'path' => 'public/' . $cleanPath],
            ['disk' => 'local',  'path' => $cleanPath],
            ['disk' => 'local',  'path' => 'public/' . $cleanPath],
        ];

        $foundDisk = null;
        $foundPath = null;
        foreach ($candidates as $c) {
            $d = Storage::disk($c['disk']);
            $exists = $d->exists($c['path']);
            Log::debug('[StorageProxy] check', ['disk' => $c['disk'], 'path' => $c['path'], 'exists' => $exists]);
            if ($exists) {
                $foundDisk = $d;
                $foundPath = $c['path'];
                break;
            }
        }

        if (!$foundDisk || !$foundPath) {
            // Try direct files under public path variants
            $publicCandidates = [
                public_path($cleanPath),
                public_path('storage/' . $cleanPath),
                public_path('uploads/' . $cleanPath),
            ];
            foreach ($publicCandidates as $pc) {
                if (is_file($pc)) {
                    $mime = mime_content_type($pc) ?: 'application/octet-stream';
                    Log::info('[StorageProxy] serve public file', ['path' => $pc]);
                    return response()->file($pc, [
                        'Content-Type'  => $mime,
                        'Cache-Control' => 'public, max-age=31536000',
                    ]);
                }
            }

            Log::warning('[StorageProxy] not found', ['request_path' => $cleanPath]);
            return response()->json(['message' => 'File not found'], 404);
        }

        $mime = $foundDisk->mimeType($foundPath) ?: 'application/octet-stream';
        $stream = $foundDisk->readStream($foundPath);

        return response()->stream(function () use ($stream) {
            if (is_resource($stream)) {
                fpassthru($stream);
                fclose($stream);
            }
        }, 200, [
            'Content-Type'  => $mime,
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    }

    /**
     * Upload a file to storage
     * POST /api/v1/storage/upload
     */
    public function upload(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|image|max:5120', // 5MB max
                'folder' => 'nullable|string|max:50',
            ]);

            $file = $request->file('file');
            $folder = $request->input('folder', 'uploads');
            
            // Generate unique filename
            $extension = $file->getClientOriginalExtension();
            $filename = time() . '_' . uniqid() . '.' . $extension;
            
            // Store file
            $path = $file->storeAs($folder, $filename, 'public');
            
            // Generate URL - sử dụng API route thay vì asset
            $url = url('api/v1/storage/' . $path);
            
            Log::info('[StorageUpload] success', [
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $path,
                'url' => $url,
                'size' => $file->getSize(),
            ]);

            return response()->json([
                'success' => true,
                'url' => $url,
                'path' => $path,
                'filename' => $filename,
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[StorageUpload] error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}




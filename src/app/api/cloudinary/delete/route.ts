import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { publicId } = await request.json()
    
    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      )
    }

    console.log('Attempting to delete image with public ID:', publicId);
    console.log('Cloudinary config:', {
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? '***' : undefined,
      api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : undefined,
    });

    // Delete the image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)
    console.log('Cloudinary delete result:', result);

    if (result.result === 'ok') {
      return NextResponse.json({ message: 'Image deleted successfully' })
    } else {
      console.error('Failed to delete image. Cloudinary response:', result);
      return NextResponse.json(
        { error: 'Failed to delete image', details: result },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
} 
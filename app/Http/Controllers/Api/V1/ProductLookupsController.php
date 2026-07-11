<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\Brand;
use App\Models\Unit;
use App\Models\Tva;
use App\Models\PriceLevel;
use App\Models\ProductType;
use App\Models\InventoryValuationMethod;
use App\Models\RegulatedProductConfig;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;

class ProductLookupsController extends Controller
{
    public function index(CompanyContextService $ctx): JsonResponse
    {
        $companyId = $ctx->get();

        $data = [
            'families'          => Family::select('id', 'name', 'slug', 'description', 'active')->where('active', true)->orderBy('name')->get(),
            'brands'            => Brand::select('id', 'name', 'slug', 'active')->where('active', true)->orderBy('name')->get(),
            'units'             => Unit::select('id', 'name', 'symbol', 'active')->where('active', true)->orderBy('name')->get(),
            'tvas'              => Tva::select('id', 'name', 'rate', 'is_default', 'active')->where('active', true)->orderBy('rate')->get(),
            'priceLevels'       => PriceLevel::select('id', 'name', 'code', 'active')->where('active', true)->orderBy('name')->get(),
            'productTypes'      => ProductType::select('id', 'name', 'active')->where('active', true)->orderBy('name')->get(),
            'valuationMethods'  => InventoryValuationMethod::select('id', 'name', 'code', 'active')->where('active', true)->orderBy('name')->get(),
            'regulatedProducts' => RegulatedProductConfig::select('id', 'product_key', 'label', 'unit_label', 'category', 'regulated_max_price', 'active')->where('active', true)->orderBy('label')->get(),
        ];

        return response()->json([
            'status'  => 'success',
            'message' => 'تم بنجاح',
            'data'    => $data,
        ]);
    }
}

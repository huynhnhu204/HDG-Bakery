<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockIn extends Model
{
    protected $table = 'stock_ins';

    protected $fillable = [
        'code','date','supplier','warehouse','note','total_qty','total_cost','status','created_by','confirmed_by','confirmed_at'
    ];

    public function items() {
        return $this->hasMany(StockInItem::class, 'stock_in_id');
    }
}

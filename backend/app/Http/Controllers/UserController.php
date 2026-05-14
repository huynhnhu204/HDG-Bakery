<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class UserController extends Controller
{
    public function index(Request $r)
    {
        $q     = $r->query('q');
        $roles = $r->query('roles');
        $stat  = $r->query('status');
        $per   = max(1, (int)$r->query('per_page', 20));

        $rows = User::query()
            ->when($q, fn($qb)=>$qb->where(function($x) use ($q){
                $x->where('name','like',"%$q%")
                  ->orWhere('email','like',"%$q%")
                  ->orWhere('username','like',"%$q%");
            }))
            ->when($roles, fn($qb)=>$qb->where('roles',$roles))
            ->when(isset($stat), fn($qb)=>$qb->where('status',(int)$stat))
            ->orderByDesc('id')
            ->paginate($per);

        return response()->json($rows);
    }

    public function show(int $id)
    {
        return response()->json(User::findOrFail($id));
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'name'     => ['required','string','max:191'],
            'email'    => ['required','email','max:191','unique:user,email'],
            'phone'    => ['required','string','max:50'],
            'username' => ['required','string','max:100','unique:user,username'],
            'password' => ['required','string','min:6'],
            'roles'    => ['nullable','in:admin,customer'],
            'avatar'   => ['nullable','string','max:255'],
            'status'   => ['nullable','integer'],
        ]);

        $data['roles']      = $data['roles'] ?? 'customer';
        $data['created_at'] = Carbon::now();
        $data['created_by'] = auth()->id() ?? 1;
        $data['status']     = $data['status'] ?? 1;

        $row = User::create($data);
        return response()->json($row, 201);
    }

    public function update(Request $r, int $id)
    {
        $row = User::findOrFail($id);

        $data = $r->validate([
            'name'     => ['sometimes','required','string','max:191'],
            'email'    => ['sometimes','required','email','max:191',"unique:user,email,$id"],
            'phone'    => ['sometimes','required','string','max:50'],
            'username' => ['sometimes','required','string','max:100',"unique:user,username,$id"],
            'password' => ['nullable','string','min:6'],
            'roles'    => ['nullable','in:admin,customer'],
            'avatar'   => ['nullable','string','max:255'],
            'status'   => ['nullable','integer'],
        ]);

        $data['updated_at'] = Carbon::now();
        $data['updated_by'] = auth()->id() ?? 1;

        $row->fill($data)->save();
        return response()->json($row);
    }

    public function destroy(int $id)
    {
        $row = User::findOrFail($id);
        $row->status = 0;
        $row->updated_at = Carbon::now();
        $row->updated_by = auth()->id() ?? 1;
        $row->save();

        return response()->json(['message'=>'Disabled (status=0)']);
    }
}
